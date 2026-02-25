/* eslint-disable require-await */
import * as express from 'express';
import { ApiController, IResponse } from '../api/api.module.js';
import { Extractor } from '../environment/extractor.js';
import { IController } from '../server/controller.interface.js';
// import type { PersistenceConnector } from '../persistence/persistence.connector.js';


export class StatusController extends ApiController implements IController {

    private static instance: StatusController;
    private router: express.Router;
    private stopped: boolean;


    // ===========================================
    //               CONSTRUCTOR
    // ===========================================
    constructor() {
        super();
        // eslint-disable-next-line new-cap
        this.router = express.Router();
        this.stopped = false;
    }

    // ===========================================
    //               STATIC FUNCTIONS
    // ===========================================
    public static getInstance(): StatusController {
        if (!StatusController.instance) {
            StatusController.instance = new StatusController();
        }
        return StatusController.instance;
    }


    // ===========================================
    //               PUBLIC FUNCTIONS
    // ===========================================
    public getRouter(prefix: string): express.Router {
        return this.registerEndpoints(this.router, prefix, [
            { method: 'get', endpoint: '', handler: this.getStatus },
        ]);
    }

    public stop(): Promise<boolean> {
        this.stopped = true;
        return Promise.resolve(this.stopped);
    }

    public async getStatus(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<any>> {
        return { status: 200, body: {
            status: this.stopped ? 'stopped' : 'running',
            mode: Extractor.extractString('MODE', 'unknown').toLowerCase(),
            time: new Date().toISOString(),
        }};
    }
}
