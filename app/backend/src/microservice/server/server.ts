import express from 'express';
import { Server as HttpServer } from 'http';
import { LogFactory } from '../logs/log.factory';
import { LogService } from '../logs/log.service';
import { ServerConfig } from './server-config.interface';
import { IController } from './controller.interface';
import cors from 'cors';

export class Server {

    private apiRoot: string;
    private port: number;
    private logger: LogService;
    private app: express.Application;
    private server?: HttpServer;
    private controllers: IController[];

    constructor(config: ServerConfig) {
        this.logger = LogFactory.makeService();
        this.controllers = [];
        this.app = express();
        this.app.use(cors()); // Enable CORS for all routes
        this.app.use(express.json());
        this.apiRoot = config.apiRoot ?? '/api';
        this.port = config.port ?? 9999;
    }

    public register(endpoint: string, controller: IController): Server {
        try {
            this.controllers.push(controller);
            const prefix = this.apiRoot + endpoint;
            this.app.use(prefix, controller.getRouter(prefix));
        } catch (error) {
            console.log('error', error);
        }
        return this;
    }

    public start(): Server {
        this.app.use((req: express.Request, res: express.Response) => {
            res.status(500).send('Something went wrong.')
            this.logger.error(`Error handling request for endpoint ${req.url}`);
        });

        this.server = this.app.listen(this.port, () => {
            this.logger.info(`Server listening on port ${this.port}.`);
        });

        return this;
    }

    public stop(): Promise<boolean> {
        const promisesToStop = this.controllers.map(controller => controller.stop());
        const allSucessful = (results: boolean[]): boolean => results.reduce((all, current) => all && current, true);
        return Promise.all(promisesToStop).then(allSucessful).then(success => {
            this.server?.close();
            return success;
        });
    }

    public getApp(): express.Application {
        return this.app;
    }

}