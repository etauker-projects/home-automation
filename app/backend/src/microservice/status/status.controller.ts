/* eslint-disable require-await */
import * as express from 'express';
import { ApiController, IResponse } from '../api/api.module';
import { Extractor } from '../environment/extractor';
import { IController } from '../server/controller.interface';
import type { PersistenceConnector } from '../persistence/persistence.connector';


export class StatusController extends ApiController implements IController {

    private static instance: StatusController;
    private router: express.Router;
    private stopped: boolean;


    // ===========================================
    //               CONSTRUCTOR
    // ===========================================
    constructor(connector: PersistenceConnector) {
        super(connector);
        // eslint-disable-next-line new-cap
        this.router = express.Router();
        this.stopped = false;
    }

    // ===========================================
    //               STATIC FUNCTIONS
    // ===========================================
    public static getInstance(connector: PersistenceConnector): StatusController {
        if (!StatusController.instance) {
            StatusController.instance = new StatusController(connector);
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
