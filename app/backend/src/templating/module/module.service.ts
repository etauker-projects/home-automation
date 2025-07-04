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

    public async saveModule(module: Module): Promise<Module> {
        const modules = await this.getModules();
        const index = modules.findIndex(m => m.id === module.id);
        if (index > -1) {
            modules.splice(index, 1, module);
            const payload = JSON.stringify({ modules });
            const sourceRoot = resolve(this.sourceDirectory);
            const metadataPath = resolve(sourceRoot, '.metadata.json');
            await writeFile(metadataPath, payload, { encoding: 'utf-8', flag: 'w' });
        }
        return this.getModule(module.id);
    }

    public async getTemplateFiles(moduleId: string): Promise<TemplateMetadata[]> {
        const module = await this.getModule(moduleId);
        return module.templates ?? [];
    }

    public async getEntityFiles(moduleId: string, templateId: string): Promise<EntityMetadata[]> {
        const destinationRoot = resolve(this.destinationDirectory);
        const module = await this.getModule(moduleId);
        const template = (module.templates ?? []).find(t => t.id === templateId);
        const modulePath = resolve(destinationRoot, module.key);

        const items = await readdir(modulePath, {
            withFileTypes: true,
            recursive: true,
            encoding: 'utf-8',
        });

        return items
            .filter(item => item.isFile())
            .map(item => resolve(item.parentPath, item.name).replace(destinationRoot, ''))
            .filter(path => path.includes(template?.type))
            .map(path => {
                const parts = path.split('/');
                const id = parts.pop().replace('.yaml', '');
                const type = parts.pop();
                const meta = module.entities.find(meta => meta.templateId === templateId && meta.id === id);
                const managed = !!meta;
                const variables = managed ? meta.variables : {};
                return { id, templateId: meta?.templateId, type, managed, variables };
            })
        ;
    }

    public async getTemplateFile(moduleId: string, templateId: string): Promise<TemplateFile> {
        const module = await this.getModule(moduleId);
        const meta = (module.templates ?? []).find(meta => meta.id === templateId);
        const path = this.formatPath(module.key, meta.type, 'template');
        const fullpath = resolve(this.sourceDirectory, path.substring(1));

        const contents = await readFile(fullpath, {
            encoding: 'utf-8',
        });

        return { ...meta, content: contents };
    }

    public async getEntityFile(moduleId: string, templateId: string, entityId: string): Promise<EntityFile> {
        const module = await this.getModule(moduleId);
        const meta = (module.entities ?? []).find(meta => meta.id === entityId);
        const path = this.formatPath(moduleId, meta.type, meta.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));

        const contents = await readFile(fullpath, {
            encoding: 'utf-8',
        });

        return { ...meta, content: contents };
    }

    public async saveEntityFile(moduleId: string, templateId: string, file: EntityFile): Promise<EntityFile> {
        const module = await this.getModule(moduleId);
        const path = this.formatPath(module.key, file.type, file.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));

        try {
            await readFile(fullpath, { encoding: 'utf-8' });
            throw new Error(`File already exists: ${fullpath}`);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                await writeFile(fullpath, file.content, { encoding: 'utf-8', flag: 'wx' });
                delete file.content;

                if (!module.entities) {
                    module.entities = [];
                }
                const index = module.entities.findIndex(meta => meta.templateId === templateId && meta.id === file.id);
                if (index > -1) {
                    module.entities?.splice(index, 1, file);
                } else {
                    module.entities.push(file);
                }
                await this.saveModule(module);
                return file;
            }
            throw err;
        }
    }

    private formatPath(moduleId: string, entityType: string, id: string): string {
        return `/${moduleId}/${entityType}/${id}.yaml`;
    }

}