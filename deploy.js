import { Client } from 'node-scp'

var remote_server = {
    host: process.env.SCP_HOST,
    port: process.env.SCP_PORT,
    username: process.env.SCP_USER,
    password: process.env.SCP_PASSWORD,
}

//console.log(remote_server)

const local_folder_path = './www';
const detination_folder_path = '/home/c75424/grosport.ru/www';

send_folder_using_async_await(local_folder_path, detination_folder_path);

async function send_folder_using_async_await(folder_path, destination_path) {
    try {
        const client = await Client(remote_server)
        //очистка папки
        await client.emptyDir(detination_folder_path)

        console.log('Deploy folder from ' + local_folder_path)

        await client.uploadDir(folder_path, destination_path)
        client.close()
        console.log('Завершено!')
    } catch (e) {
        console.log('Ошибка', e)
    }
}
