import express from 'express';

import { Logger } from './logger/logger.js';

export class Server {

    private logger: Logger;
    private active = false;
    private server: express.Express;

    constructor(private port: number) {
        this.logger = new Logger();
        this.server = express();
    }

    public start() {
        this.logger.log(`Server is running on port ${this.port}`);
        this.active = true;
    }

    public shutdown() {
        this.logger.log('Server is shutting down');
        this.active = false;
    }

    public isRunning(): boolean {
        return this.active;
    }
}
