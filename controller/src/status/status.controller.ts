/* eslint-disable require-await */
import * as express from 'express';
import { ApiController, IResponse } from '../framework/api/api.module.js';
import { Extractor } from '../framework/environment/extractor.js';
import { IController } from '../framework/server/controller.interface.js';


export class StatusController extends ApiController implements IController {

    private static instance: StatusController;

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

    public async getStatus(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<any>> {
        return { status: 200, body: {
            status: this.isStopped() ? 'stopped' : 'running',
            mode: Extractor.extractString('MODE', 'unknown').toLowerCase(),
            time: new Date().toISOString(),
        }};
    }
}
