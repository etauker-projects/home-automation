import { exec } from 'child_process';

export class DockerConnector {

    public async showDockerContainers(): Promise<string> {
        return new Promise((resolve, reject) => {
            exec('docker ps', (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    reject(error);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                resolve(stdout);
            });
        });
    }

}