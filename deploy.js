import { Client } from 'node-scp'

var remote_server = {
    host: process.env.SCP_HOST,
    port: process.env.SCP_PORT,
    username: process.env.SCP_USER,
    password: process.env.SCP_PASSWORD,
    // forceIPv4: boolean,  //Connection allow only via resolved IPv4 address (true/false)
    // forceIPv6: boolean,  //Connection allow only via resolved IPv6 address (true/false)
    // privateKey: fs.readFileSync('./key.pem'),
    // passphrase: 'your key passphrase', 
}

console.log(remote_server)

const local_folder_path = './www';
const detination_folder_path = '/home/c75424/grosport.ru/www';

send_folder_using_async_await(local_folder_path, detination_folder_path);

async function send_folder_using_async_await(folder_path, destination_path) {
    try {
        const client = await Client(remote_server)
        // client.addListener("end", (props) => {
        //     console.log('props', props)
        // })

        // if (await client.exists(detination_folder_path)) {
        //     console.log('Remove folder ' + detination_folder_path)
        //     await client.rmdir(detination_folder_path)
        // }
        console.log('Deploy folder from ' + local_folder_path)

        await client.uploadDir(folder_path, destination_path)
        client.close()
        console.log('Done')
    } catch (e) {
        console.log(e)
    }
}
