<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$config = require __DIR__ . '/config.php';

function respond(int $status, array $payload, array $config): void
{
    http_response_code($status);
    echo json_encode($payload, $config['debug'] ? JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT : JSON_UNESCAPED_UNICODE);
    exit;
}

function clientIp(): string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if (is_string($forwarded) && $forwarded !== '') {
        $first = explode(',', $forwarded)[0];
        if (trim($first) !== '') {
            return trim($first);
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Метод не поддерживается.'], $config);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw !== false ? $raw : '', true);
if (!is_array($data)) {
    $data = $_POST;
}

$honeypot = $config['honeypot_field'];
if (isset($data[$honeypot]) && trim((string) $data[$honeypot]) !== '') {
    respond(200, ['ok' => true, 'message' => 'Заявка принята.'], $config);
}

$name = trim((string) ($data['name'] ?? ''));
$phone = trim((string) ($data['phone'] ?? ''));
$direction = trim((string) ($data['direction'] ?? ''));
$agree = isset($data['agree']) && ($data['agree'] === true || $data['agree'] === 'on' || $data['agree'] === '1' || $data['agree'] === 'true');

$errors = [];

if (mb_strlen($name, 'UTF-8') < $config['name_min_length']) {
    $errors['name'] = 'Введите имя (минимум ' . $config['name_min_length'] . ' символа).';
}

$phoneDigits = preg_replace('/\D/', '', $phone);
if (!is_string($phoneDigits) || mb_strlen($phoneDigits, 'UTF-8') < $config['phone_min_digits']) {
    $errors['phone'] = 'Введите корректный номер телефона.';
}

if (!$agree) {
    $errors['agree'] = 'Необходимо согласие на обработку данных.';
}

if ($errors !== []) {
    respond(422, ['ok' => false, 'errors' => $errors], $config);
}

$ip = clientIp();
$ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'), 0, 300);

$storageDir = $config['storage_dir'];
if (!is_dir($storageDir) && !@mkdir($storageDir, 0755, true)) {
    respond(500, ['ok' => false, 'error' => 'Не удалось создать каталог хранилища.'], $config);
}

$rateFile = $storageDir . '/rate_' . md5($ip) . '.json';
$now = time();
$rate = ['count' => 0, 'reset' => $now + (int) $config['rate_window']];
if (is_file($rateFile)) {
    $stored = json_decode((string) file_get_contents($rateFile), true);
    if (is_array($stored)) {
        if ((int) ($stored['reset'] ?? 0) <= $now) {
            $rate = ['count' => 0, 'reset' => $now + (int) $config['rate_window']];
        } else {
            $rate = $stored;
        }
    }
}
if ((int) $rate['count'] >= (int) $config['rate_limit']) {
    respond(429, ['ok' => false, 'error' => 'Слишком много заявок. Попробуйте позже.'], $config);
}
$rate['count'] = (int) $rate['count'] + 1;
file_put_contents($rateFile, json_encode($rate), LOCK_EX);

$createdAt = date('Y-m-d H:i:s');

$sqliteAvailable = extension_loaded('pdo_sqlite');
$stored = false;

if ($sqliteAvailable) {
    try {
        $pdo = new PDO('sqlite:' . $storageDir . '/' . $config['sqlite_file']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                direction TEXT NOT NULL,
                ip TEXT NOT NULL,
                user_agent TEXT NOT NULL
            )'
        );
        $stmt = $pdo->prepare(
            'INSERT INTO leads (created_at, name, phone, direction, ip, user_agent)
             VALUES (:created_at, :name, :phone, :direction, :ip, :ua)'
        );
        $stmt->execute([
            ':created_at' => $createdAt,
            ':name' => $name,
            ':phone' => $phone,
            ':direction' => $direction,
            ':ip' => $ip,
            ':ua' => $ua,
        ]);
        $stored = true;
    } catch (Throwable $e) {
        $stored = false;
    }
}

if (!$stored) {
    $logLine = json_encode([
        'created_at' => $createdAt,
        'name' => $name,
        'phone' => $phone,
        'direction' => $direction,
        'ip' => $ip,
        'user_agent' => $ua,
    ], JSON_UNESCAPED_UNICODE) . PHP_EOL;
    file_put_contents($storageDir . '/' . $config['json_log_file'], $logLine, FILE_APPEND | LOCK_EX);
}

$subject = 'Новая заявка с сайта GroSport';
$html = '<p>Поступила новая заявка:</p>'
    . '<ul>'
    . '<li><b>Имя:</b> ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><b>Телефон:</b> ' . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><b>Направление:</b> ' . htmlspecialchars($direction !== '' ? $direction : 'Не указано', ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><b>Дата и время:</b> ' . htmlspecialchars($createdAt, ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><b>IP:</b> ' . htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') . '</li>'
    . '</ul>';

$plain = "Поступила новая заявка:\n"
    . "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
    . 'Направление: ' . ($direction !== '' ? $direction : 'Не указано') . "\n"
    . "Дата и время: {$createdAt}\n"
    . "IP: {$ip}";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $config['email_from_name'] . ' <' . $config['email_from'] . '>',
    'Reply-To: ' . $config['email_from'],
];
$body = '<html><body style="font-family:Arial,sans-serif;color:#222">' . $html
    . '<p style="color:#999;font-size:12px">Это автоматическое сообщение. Обратный адрес: ' . htmlspecialchars($config['email_from'], ENT_QUOTES, 'UTF-8') . '</p>'
    . '</body></html>';

if ($sqliteAvailable && function_exists('mail') && @mail($config['email_to'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers)) === false) {
    error_log('GroSport: не удалось отправить email');
}

respond(200, ['ok' => true, 'message' => 'Заявка принята. Мы свяжемся с вами в ближайшее время.'], $config);