import type { AppConfiguration } from '../../app';
import { ApiController, type IResponse } from '../../microservice/api/api.module';
import type { PersistenceConnector } from '../../microservice/persistence/persistence.connector';
import { IController } from '../../microservice/server/controller.interface';
import * as express from 'express';
import { ModuleService } from './module.service';

export class ModuleController extends ApiController implements IController {

    private static instance: ModuleController;
    private service: ModuleService;

    constructor(connector: PersistenceConnector, config: AppConfiguration) {
        super(connector);
        this.service = new ModuleService(config);
    }

    public static getInstance(connector: PersistenceConnector, config: AppConfiguration): ModuleController {
        if (!ModuleController.instance) {
            ModuleController.instance = new ModuleController(connector, config);
        }
        return ModuleController.instance;
    }

    public getRouter(prefix: string): express.Router {
        return this.registerEndpoints(prefix, [
            { method: 'get', endpoint: '', handler: this.getModules },
            // { method: 'get', endpoint: '/:moduleId/template-files', handler: this.getTemplates },
            // { method: 'get', endpoint: '/:moduleId/template-files/:templateId', handler: this.getTemplate },
            // { method: 'get', endpoint: '/:moduleId/entity-files', handler: this.getEntities },
        ]);
    }

    private async getModules(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const modules = await this.service.getModules();
        return { status: 200, body: modules };
    }

    // private async getTemplates(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
    //     // TODO: Replace with real data source
    //     const { moduleId } = req.params;
    //     return { status: 200, body: [
    //         { id: 'plug', name: 'Plug Template', moduleId },
    //         { id: 'light', name: 'Light Template', moduleId }
    //     ]};
    // }

    // private async getEntities(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
    //     // TODO: Replace with real data source
    //     const { moduleId } = req.params;
    //     return { status: 200, body: [
    //         { id: 'office_desk_plug', name: 'Office Desk Plug', moduleId },
    //         { id: 'living_room_light', name: 'Living Room Light', moduleId }
    //     ]};
    // }

    // private async getTemplate(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
    //     // TODO: Replace with real data source
    //     const { moduleId } = req.params;
    //     const templateId: string = decodeURIComponent(req.params.templateId);
    //     return { status: 200, body: {
    //   content: `
// \${ input.id }_energy_usage_hourly:
//     name: \${ input.name } Energy Usage Hourly
//     source: sensor.\${ input.id }_energy
//     cycle: hourly
//     unique_id: meter.\${ input.id }_energy_usage_hourly
//     offset: 0
//     delta_values: false
// \${ input.id }_energy_usage_daily:
//     name: \${ input.name } Energy Usage Daily
//     source: sensor.\${ input.id }_energy
//     cycle: daily
//     unique_id: meter.\${ input.id }_energy_usage_daily
//     offset: 0
//     delta_values: false
// \${ input.id }_energy_usage_monthly:
//     name: \${ input.name } Energy Usage Monthly
//     source: sensor.\${ input.id }_energy
//     cycle: monthly
//     unique_id: meter.\${ input.id }_energy_usage_monthly
//     offset: 0
//     delta_values: false`.trim()
    //   }};
    // }
}
