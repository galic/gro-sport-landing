<?php

return [
    'email_to'      => 'info@grosport.ru',
    'email_from'    => 'no-reply@grosport.ru',
    'email_from_name' => 'Сайт GroSport',

    'storage_dir'   => __DIR__ . '/../data',
    'sqlite_file'   => 'leads.sqlite',
    'json_log_file' => 'leads.json',

    'phone_min_digits' => 10,
    'name_min_length'  => 2,

    'honeypot_field'   => 'website',
    'rate_limit'       => 5,
    'rate_window'      => 3600,

    'debug' => false,
];