import express from 'express';
import { Server as HttpServer } from 'http';
import { LogFactory } from '../logs/log.factory.js';
import { LogService } from '../logs/log.service.js';
import { ServerConfig } from './server-config.interface.js';
import { IController } from './controller.interface.js';

export class Server {

    private apiRoot: string;
    private port: number;
    private logger: LogService;
    public app: express.Application; // Made public for now
    private server?: HttpServer;
    private controllers: IController[];

    constructor(config: ServerConfig) {
        this.logger = LogFactory.makeService();
        this.controllers = [];
        this.app = express();
        this.apiRoot = config.apiRoot ?? '/api';
        this.port = config.port ?? 9999;
    }

    public register(endpoint: string, controller: IController): Server {
        try {
            this.controllers.push(controller);
            const prefix = this.apiRoot + endpoint;
            this.app.use(prefix, controller.getRouter(prefix));
        } catch (error) {
            this.logger.error('error', undefined, error);
        }
        return this;
    }

    public start(): Server {
        this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(500).send('Something went wrong.')
            this.logger.error(`Error handling request for endpoint ${req.url}`,  undefined, err);
        });

        this.server = this.app.listen(this.port, () => {
            this.logger.info(`Server listening on port ${this.port}.`);
        });

        return this;
    }

    public stop(): Promise<boolean> {
        const promisesToStop = this.controllers.map(controller => controller.stop());
        const allSucessful = (results: boolean[]) => results.reduce((all, current) => all && current, true);
        return Promise.all(promisesToStop).then(allSucessful).then(success => {
            this.server?.close();
            return success;
        });
    }

}