import * as express from 'express';
import { HttpError, IEndpoint, IResponse } from './api.module.js';
import { LogService } from './logger.interface.js';
import { LogFactory } from '../logs/log.factory.js';


export class ApiController {

    private stopped: boolean;
    protected router: express.Router;
    protected logger: LogService

    constructor() {
        this.stopped = false;
        this.router = express.Router();
        this.logger = LogFactory.makeService();
    }

    public stop(): Promise<boolean> {
        this.stopped = true;
        return Promise.resolve(this.stopped);
    }

    public isStopped(): boolean {
        return this.stopped;
    }

    protected registerEndpoints(
        router: express.Router,
        prefix: string,
        registrations: IEndpoint[]
    ): express.Router {

        this.logger.info('Registering  endpoints:');
        registrations.forEach(registration => {
            const method = registration.method;
            const endpoint = registration.endpoint;
            const handler = async (req: express.Request, res: express.Response) => {
                try {
                    const response = await registration.handler.bind(
                        this, endpoint,
                    )(req, res);

                    if (response) {
                        const { status, body } = response;
                        res.status(status).json(body);
                    }
                    //  else if (!res.closed) {
                        // res.status(200).send();
                    // }
                    // res.status(status).json(body);
                } catch (error) {
                    const { status, body } = this.parseError(error);
                    res.status(status).json(body);
                }
            };

            (router as any)[method](endpoint, handler);
            this.logger.info(`-- ${ method.toUpperCase() } ${ prefix }${ endpoint }`);
        });
        return router;
    }

    protected parseError(error: any): IResponse<{ message: string }> {
        const status = typeof error?.code === 'number' ? error.code : 500;
        const message = error?.message || 'Unexpected error occurred';
        return { status, body: { message }};
    }

    protected validateUuid(id: string, pathParam: boolean = false): Promise<string> {
        const regex = new RegExp(`[a-zA-Z|\\d]{8}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{12}`, 'iu');
        if (!regex.test(id)) {
            if (pathParam) {
                throw new HttpError(404, 'Invalid UUID in path');
            } else {
                throw new HttpError(400, 'Invalid UUID provided');
            }
        }
        return Promise.resolve(id);
    }
}

