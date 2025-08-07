import type { AppConfiguration } from '../../app';
import { ApiController, type IRequestContext, type IResponse } from '../../microservice/api/api.module';
import type { PersistenceConnector } from '../../microservice/persistence/persistence.connector';
import { IController } from '../../microservice/server/controller.interface';
import * as express from 'express';
import { ModuleService } from './module.service';
import type { EntityFile, EntityMetadata, Module, TemplateFile, TemplateMetadata } from './module.interfaces';
import { MetadataService } from '../metadata/metadata.service';
import { randomUUID } from 'crypto';

export class ModuleController extends ApiController implements IController {

    private static instance: ModuleController;
    private service: ModuleService;
    private metadata: MetadataService;

    constructor(connector: PersistenceConnector, config: AppConfiguration) {
        super(connector);
        this.service = new ModuleService(config, this.logger);
        this.metadata = new MetadataService(config, this.logger);
    }

    public static getInstance(connector: PersistenceConnector, config: AppConfiguration): ModuleController {
        if (!ModuleController.instance) {
            ModuleController.instance = new ModuleController(connector, config);
        }
        return ModuleController.instance;
    }

    public getRouter(prefix: string): express.Router {
        return this.registerEndpointsV2(prefix, [
            { method: 'get', endpoint: '/', handler: this.getModules },
            { method: 'get', endpoint: '/:moduleId/templates', handler: this.getTemplateFiles },
            { method: 'get', endpoint: '/:moduleId/templates/:templateId', handler: this.getTemplateFile },
            { method: 'get', endpoint: '/:moduleId/templates/:templateId/entities', handler: this.getEntityFiles },
            { method: 'get', endpoint: '/:moduleId/unmanaged/entities', handler: this.getUnmanagedEntityFiles },
            { method: 'post', endpoint: '/:moduleId/templates/:templateId/entities', handler: this.postEntityFile },
            { method: 'put', endpoint: '/:moduleId/templates/:templateId/entities/:entityId', handler: this.putEntityFile },
            { method: 'delete', endpoint: '/:moduleId/templates/:templateId/entities/:entityId', handler: this.deleteEntityFile },
        ]);
    }

    private async getModules(context: IRequestContext): Promise<IResponse<Module[]>> {
        const metadata = await this.metadata.getMetadata(context);
        return { status: 200, body: metadata.modules };
    }

    private async getTemplateFiles(context: IRequestContext, req: express.Request): Promise<IResponse<TemplateMetadata[]>> {
        const { moduleId } = req.params;
        const metas = await this.metadata.getTemplates(context.tracer, moduleId);
        return { status: 200, body: metas };
    }

    private async getTemplateFile(context: IRequestContext, req: express.Request): Promise<IResponse<TemplateFile>> {
        const { moduleId, templateId } = req.params;

        const meta = await this.metadata.getTemplate(moduleId, templateId, true);
        if (!meta || !meta.value) {
            return { status: 404, body: {} as TemplateFile };
        }

        const templateFile = await this.service.getTemplateFile(meta.id, meta.value);
        return { status: 200, body: templateFile };
    }

    private async getEntityFiles(context: IRequestContext, req: express.Request): Promise<IResponse<EntityMetadata[]>> {
        const { moduleId, templateId } = req.params;

        const module = await this.metadata.getModule(moduleId);
        const entities = await this.metadata.getEntitiesForModule(context.tracer, module, templateId);
        return { status: 200, body: entities };
    }

    private async getUnmanagedEntityFiles(context: IRequestContext, req: express.Request): Promise<IResponse<EntityMetadata[]>> {
        const { moduleId } = req.params;

        const module = await this.metadata.getModule(moduleId);
        const entities = await this.metadata.getUnmanagedEntitiesForModule(context.tracer, module);
        return { status: 200, body: entities };
    }

    private async postEntityFile(context: IRequestContext, req: express.Request): Promise<IResponse<EntityFile>> {
        const { moduleId, templateId } = req.params;
        const file = req.body;

        const metadata = { ...file };
        delete metadata.file;
        delete metadata.content;

        const module = await this.metadata.getModule(moduleId, true);
        await this.service.ensureEntityFileDoesNotExist(module.key, metadata.type, file);

        const [ entity ] = await Promise.all([
            this.service.saveEntityFile(module.key, metadata.type, file),
            this.metadata.upsertEntity(moduleId, templateId, metadata),
        ]);
        return { status: 200, body: entity };
    }

    private async putEntityFile(context: IRequestContext, req: express.Request): Promise<IResponse<EntityFile>> {
        const { moduleId, templateId, entityId } = req.params;
        const file = req.body;

        const metadata = { ...file };
        delete metadata.file;
        delete metadata.content;

        const module = await this.metadata.getModule(moduleId, true);
        // await this.service.ensureEntityFileDoesNotExist(module.key, metadata.type, file);

        const [ entity ] = await Promise.all([
            this.service.saveEntityFile(module.key, metadata.type, file, true),
            this.metadata.upsertEntity(moduleId, templateId, metadata),
        ]);
        return { status: 200, body: entity };
    }

    private async deleteEntityFile(context: IRequestContext, req: express.Request): Promise<IResponse<void>> {
        const { moduleId, templateId, entityId } = req.params;

        const module = await this.metadata.getModule(moduleId, true);
        const meta = await this.metadata.getTemplate(moduleId, templateId, true);
        if (!meta) {
            return { status: 404, body: undefined };
        }

        await Promise.all([
            this.service.deleteEntityFile(module.key, meta.value!.type, entityId),
            this.metadata.deleteEntity(moduleId, templateId, entityId),
        ]);
        return { status: 204, body: undefined };
    }

}
