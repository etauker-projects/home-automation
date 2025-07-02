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
            { method: 'get', endpoint: '/:moduleId/template-files', handler: this.getTemplateFiles },
            { method: 'get', endpoint: '/:moduleId/template-files/:templatePath', handler: this.getTemplateFile },
            { method: 'get', endpoint: '/:moduleId/entity-files', handler: this.getEntityFiles },
            { method: 'post', endpoint: '/:moduleId/template-files/:templatePath/entity-files', handler: this.postEntityFile },
        ]);
    }

    private async getModules(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const modules = await this.service.getModules();
        return { status: 200, body: modules };
    }

    private async getTemplateFiles(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const { moduleId } = req.params;
        const modules = await this.service.getTemplateFiles(moduleId);
        return { status: 200, body: modules };
    }

    private async getEntityFiles(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const { moduleId } = req.params;
        const modules = await this.service.getEntityFiles(moduleId);
        return { status: 200, body: modules };
    }

    private async getTemplateFile(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const { moduleId } = req.params;
        const templatePath = decodeURIComponent(req.params.templatePath);
        const template = await this.service.getTemplateFile(moduleId, templatePath);
        return { status: 200, body: template };
    }

    private async postEntityFile(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<any>> {
        const { moduleId } = req.params;
        const templatePath = decodeURIComponent(req.params.templatePath);
        const content = req.body.content;
        const template = await this.service.saveEntityFile(moduleId, templatePath, content);
        return { status: 200, body: template };
    }
}
