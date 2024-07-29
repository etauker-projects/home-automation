// import { exec } from 'child_process';
import { spawn } from 'node:child_process';

export class DockerConnector {

    public async showDockerContainers(): Promise<void> {
        return this.executeComand('docker', ['ps']);
    }

    public async updateHomeAssistant(): Promise<void> {
        // await this.executeComand('docker', ['--version']);
        // await this.executeComand('docker', ['--help']);
        return this.executeComand('npm', ['run', 'update-hass']);
    }

    private async executeComand(command: string, args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const ls = spawn(command, args);

            ls.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            ls.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                // reject(data);
            });

            ls.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        });
    }

}