import { resolve } from 'path';
import { readFile, readdir, writeFile } from 'fs/promises';
import type { AppConfiguration } from '../../app';
import type { EntityFile, EntityMetadata, Module, TemplateFile, TemplateMetadata } from './module.interfaces';


export class ModuleService {

    private sourceDirectory: string;
    private destinationDirectory: string;

    constructor(appconfig: AppConfiguration) {
        this.sourceDirectory = appconfig.inputDirectory;
        this.destinationDirectory = appconfig.outputDirectory;
    }

    public async getModules(): Promise<Module[]> {
        const sourceRoot = resolve(this.sourceDirectory);
        const metadataPath = resolve(sourceRoot, '.metadata.json');
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content).modules as Module[];
        return metadata;
    }

    public async getModule(moduleId: string): Promise<Module | undefined> {
        const modules = await this.getModules();
        return modules.find(module => module.id === moduleId);
    }

    public async getTemplateFiles(moduleId: string): Promise<TemplateMetadata[]> {
        const module = await this.getModule(moduleId);
        return module.templates ?? [];
    }

    public async getEntityFiles(moduleId: string, templateId: string): Promise<EntityMetadata[]> {
        const destinationRoot = resolve(this.destinationDirectory);
        const module = await this.getModule(moduleId);
        const modulePath = resolve(destinationRoot, module.key);

        const items = await readdir(modulePath, {
            withFileTypes: true,
            recursive: true,
            encoding: 'utf-8',
        });

        return items
            .filter(item => item.isFile())
            .map(item => resolve(item.parentPath, item.name).replace(destinationRoot, ''))
            .map(path => {
                const parts = path.split('/');
                const id = parts.pop().replace('.yaml', '');
                const type = parts.pop();
                const resolvedTemplateId = module.templates.find(t => t.type === type).id;
                return { id, templateId: resolvedTemplateId, type };
            })
            .filter(meta => meta.templateId === templateId)
        ;
    }

    public async getTemplateFile(moduleId: string, templateId: string): Promise<TemplateFile> {
        const module = await this.getModule(moduleId);
        const templateFiles = module.templates ?? [];
        const meta = templateFiles.find(meta => meta.id === templateId);
        const path = this.formatPath(module.key, meta.type, 'template');
        const fullpath = resolve(this.sourceDirectory, path.substring(1));

        const contents = await readFile(fullpath, {
            encoding: 'utf-8',
        });

        return {
            id: templateId,
            type: meta.type,
            content: contents,
        }
    }

    public async getEntityFile(moduleId: string, templateId: string, entityId: string): Promise<EntityFile> {
        const entityFiles = await this.getEntityFiles(moduleId, templateId);
        const meta = entityFiles.find(meta => meta.id === entityId);
        const path = this.formatPath(moduleId, meta.type, entityId);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));

        const contents = await readFile(fullpath, {
            encoding: 'utf-8',
        });

        return {
            id: entityId,
            templateId: templateId,
            type: meta.type,
            content: contents,
        }
    }

    public async saveEntityFile(moduleId: string, templatePath: string, content: string): Promise<{ path: string; content: string }> {
        const destinationRoot = resolve(this.destinationDirectory);
        const templateFilePath = resolve(destinationRoot, templatePath.substring(1));

        try {
            await readFile(templateFilePath, { encoding: 'utf-8' });
            throw new Error(`File already exists: ${templateFilePath}`);
        } catch (err: any) {
            if (err.code === 'ENOENT') {

                await writeFile(templateFilePath, content, { encoding: 'utf-8', flag: 'wx' });
                return {
                    path: templatePath,
                    content: content,
                };
            }
            throw err;
        }
    }

    private formatPath(moduleId: string, entityType: string, id: string): string {
        return `/${moduleId}/${entityType}/${id}.yaml`;
    }

}