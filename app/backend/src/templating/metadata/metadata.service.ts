import { resolve } from 'path';
import { readdir, readFile, writeFile } from 'fs/promises';
import type { AppConfiguration } from '../../app';
import type { EntityMetadata, Identifier, Metadata, MetaResponse, ModuleMetadata, TemplateMetadata } from './metadata.interfaces';
import type { LogService } from '../../microservice/logs/log.service';
import type { Dirent } from 'fs';


export class MetadataService {

    private sourceDirectory: string;
    private destinationDirectory: string;

    constructor(appconfig: AppConfiguration, private logger: LogService) {
        this.sourceDirectory = appconfig.inputDirectory;
        this.destinationDirectory = appconfig.outputDirectory;
    }

    public async getMetadata(): Promise<Metadata> {
        const sourceRoot = resolve(this.sourceDirectory);
        const metadataPath = resolve(sourceRoot, '.metadata.json');
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content) as Metadata;
        return metadata;
    }

    public async getModule<S extends boolean = true>(moduleId: string, strict: boolean = true): Promise<S extends true ? ModuleMetadata : (ModuleMetadata | undefined)> {
        const metadata = await this.getMetadata();
        const module = metadata?.modules?.find(module => module.id === moduleId);

        if (strict && !module) {
            throw new Error(`Module with ID ${moduleId} not found`);
        }

        // TODO fix conditional return type
        return module!;
    }

    public async getEntities(tracer: string, moduleId: string, templateId: string): Promise<EntityMetadata[]> {
        const module = await this.getModule(moduleId);
        this.logger.trace(`Module ${ module ? 'found' : 'not found'}`, tracer);
        return this.getEntitiesForModule(tracer, module, templateId);
    }

    public async getEntitiesForModule(tracer: string, module: ModuleMetadata, templateId: string): Promise<EntityMetadata[]> {
        const entities =  (module?.entities || []).filter(entity => entity.templateId === templateId);
        this.logger.trace(`${entities.length} managed entities returned for template '${templateId}'`, tracer);
        return entities;
    }

    public async getUnmanagedEntitiesForModule(tracer: string, module: ModuleMetadata): Promise<EntityMetadata[]> {
        const path = resolve(this.destinationDirectory, module.key);

        const items = await readdir(path, {
            withFileTypes: false,
            recursive: true,
            encoding: 'utf-8',
        });

        const metas = items
            .filter(item => item.endsWith('.yaml'))
            .map(item => {
                const [entityType, filename] = item.split('/');
                return {
                    id: filename.replace('.yaml', ''),
                    templateId: '',
                    type: entityType,
                    managed: false,
                    variables: { },
                } as EntityMetadata;
            });

        this.logger.trace(`${metas.length} unmanaged entities returned`, tracer);
        return metas;
    }

    public async getEntity(moduleId: string, entityId: string): Promise<MetaResponse<EntityMetadata>> {
        const module = await this.getModule(moduleId);
        const entity = module?.entities?.find(entity => entity.id === entityId);
        const id = this.formatId(module, entity?.id, entity?.type);
        return { id, value: entity }
    }

    public async getTemplates(tracer: string, moduleId: string): Promise<TemplateMetadata[]> {
        const module = await this.getModule(moduleId);
        this.logger.trace(`Module ${ module ? 'found' : 'not found'}`, tracer);
        const templates = module?.templates || [];
        this.logger.trace(`${templates.length} templates returned`, tracer);
        return templates;
    }

    public async getTemplate(moduleId: string, templateId: string): Promise<MetaResponse<TemplateMetadata>> {
        const module = await this.getModule(moduleId);
        const template = module?.templates?.find(template => template.id === templateId);
        const id = this.formatId(module, template?.id, template?.type);
        return { id, value: template }
    }

    public async deleteEntity(moduleId: string, templateId: string, entityId: string): Promise<MetaResponse<EntityMetadata>> {
        const module = await this.getModule(moduleId, true);
        if (module.entities) { module.entities = [] };
        module.entities = module.entities?.filter(meta => !this.entityMatches(templateId, entityId, meta));
        await this.upsertModule(module);
        return this.getEntity(moduleId, entityId);
    }

    public async upsertEntity(moduleId: string, templateId: string, entity: EntityMetadata): Promise<MetaResponse<EntityMetadata>> {
        const module = await this.getModule(moduleId);
        if (module.entities) { module.entities = [] };

        const index = module.entities!.findIndex(meta => this.entityMatches(templateId, entity.id, meta));

        index > -1
            ? module.entities!.splice(index, 1, entity)
            : module.entities!.push(entity)
        ;

        await this.upsertModule(module);
        return this.getEntity(moduleId, entity.id);
    }

    public async upsertModule(module: ModuleMetadata): Promise<ModuleMetadata> {
        const metadata = await this.getMetadata();
        if (metadata.modules) { metadata.modules = [] };

        const index = metadata.modules.findIndex(m => m.id === module.id);

        index > -1
            ? metadata.modules.splice(index, 1, module)
            : metadata.modules.push(module)
        ;

        await this.saveMedatada(metadata);
        return this.getModule(module.id);
    }

    public async saveMedatada(metadata: Metadata): Promise<Metadata> {
        const payload = JSON.stringify(metadata);
        const sourceRoot = resolve(this.sourceDirectory);
        const metadataPath = resolve(sourceRoot, '.metadata.json');
        await writeFile(metadataPath, payload, { encoding: 'utf-8', flag: 'w' });
        return this.getMetadata();
    }

    private entityMatches(templateId: string, entityId: string, meta: EntityMetadata) {
        return meta.templateId === templateId && meta.id === entityId;
    }

    private formatId(module?: ModuleMetadata, id?: string, type?: string): Identifier {
        if (!module) {
            throw new Error('Module is a required component of filepath');
        } else if (!id) {
            throw new Error('ID is a required component of filepath');
        } else if (!type) {
            throw new Error('Type is a required component of filepath');
        }
        return { id, type, moduleId: module.id, moduleKey: module.key }
    }

}