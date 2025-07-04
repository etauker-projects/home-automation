import type { AppConfiguration } from '../../app';
import { ApiController, type IResponse } from '../../microservice/api/api.module';
import type { PersistenceConnector } from '../../microservice/persistence/persistence.connector';
import { IController } from '../../microservice/server/controller.interface';
import * as express from 'express';
import { ModuleService } from './module.service';
import type { EntityFile, EntityMetadata, Module, TemplateFile, TemplateMetadata } from './module.interfaces';

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
            { method: 'get', endpoint: '/:moduleId/templates', handler: this.getTemplateFiles },
            { method: 'get', endpoint: '/:moduleId/templates/:templateId', handler: this.getTemplateFile },
            { method: 'get', endpoint: '/:moduleId/templates/:templateId/entities', handler: this.getEntityFiles },
            { method: 'post', endpoint: '/:moduleId/templates/:templateId/entities', handler: this.postEntityFile },
            { method: 'delete', endpoint: '/:moduleId/templates/:templateId/entities/:entityId', handler: this.deleteEntityFile },
        ]);
    }

    private async getModules(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<Module[]>> {
        const modules = await this.service.getModules();
        return { status: 200, body: modules };
    }

    private async getTemplateFiles(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<TemplateMetadata[]>> {
        const { moduleId } = req.params;
        const modules = await this.service.getTemplateFiles(moduleId);
        return { status: 200, body: modules };
    }

    private async getTemplateFile(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<TemplateFile>> {
        const { moduleId, templateId } = req.params;
        const template = await this.service.getTemplateFile(moduleId, templateId);
        return { status: 200, body: template };
    }

    private async getEntityFiles(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<EntityMetadata[]>> {
        const { moduleId, templateId } = req.params;
        const modules = await this.service.getEntityFiles(moduleId, templateId);
        return { status: 200, body: modules };
    }

    private async postEntityFile(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<EntityFile>> {
        const { moduleId, templateId } = req.params;
        const file = req.body;
        const entity = await this.service.saveEntityFile(moduleId, templateId, file);
        return { status: 200, body: entity };
    }

    private async deleteEntityFile(endpoint: string, req: express.Request, res: express.Response): Promise<IResponse<void>> {
        const { moduleId, templateId, entityId } = req.params;
        const entity = await this.service.deleteEntityFile(moduleId, templateId, entityId);
        return { status: 204, body: undefined };
    }
}
