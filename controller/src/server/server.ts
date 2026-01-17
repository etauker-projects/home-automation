import express from 'express';
import { Server as HttpServer } from 'node:http';
import { LogFactory, LogService } from '../logs/log.module.js';

export abstract class Server<ChildClass extends Server<ChildClass>> {

    private child: ChildClass;
    private app: express.Application;
    private server: HttpServer | undefined;
    protected logger: LogService;
    private logsEnabled: boolean;

    constructor(
        private port: number,
        private apiRoot: string,
    ) {
        this.child = this as unknown as ChildClass;
        this.app = express();
        this.logger = LogFactory.makeService();
        this.logsEnabled = true;
    }

    public start(): ChildClass {
        this.app.use(function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
            res.status(500).send('Something broke!')
        });

        this.server = this.app.listen(this.port, () => {
            if (this.logsEnabled) {
                this.logger.info(`Server listening on port ${this.port}.`);
            }
        });

        return this.child;
    }

    public stop(): ChildClass {
        this.logger.info(`Stopping server on port ${this.port}`);
        this.server?.close();
        return this.child;
    }

    public silent(): ChildClass {
        this.logsEnabled = false;
        return this.child;
    }

    public getPort(): number {
        return this.port;
    }

    public getApiRoot(): string {
        return this.apiRoot;
    }

    protected register(endpoint: string, router: express.Router): ChildClass {
        this.app.use(this.apiRoot + endpoint, router);
        return this.child;
    }
}