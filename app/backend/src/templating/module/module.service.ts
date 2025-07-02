import { resolve } from 'path';
import { readFile, readdir } from 'fs/promises';
import type { AppConfiguration } from '../../app';

export interface Module {
    id: string;
    name: string;
    description: string;
}

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
        const metadata = JSON.parse(content);

        const items = await readdir(sourceRoot, {
            withFileTypes: true,
            recursive: false,
            encoding: 'utf-8',
        });

        for (const item of items) {
            if (!item.isFile()) {
                if (!metadata.modules.map(m => m.id).includes(item.name)) {
                    metadata.modules.push({
                        id: item.name,
                        name: "",
                        description: "",
                    });
                }
            }
        }

        return metadata.modules;
    }

    public async getTemplateFiles(moduleId: string): Promise<string[]> {
        const sourceRoot = resolve(this.sourceDirectory);
        const modulePath = resolve(sourceRoot, moduleId);

        const items = await readdir(modulePath, {
            withFileTypes: true,
            recursive: true,
            encoding: 'utf-8',

        });

        return items
            .filter(item => item.isFile())
            .map(item => resolve(item.parentPath, item.name).replace(sourceRoot, ''))
    }

    public async getEntityFiles(moduleId: string): Promise<{ id: string; path: string; templatePath: string }[]> {
        const destinationRoot = resolve(this.destinationDirectory);
        const modulePath = resolve(destinationRoot, moduleId);

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
                const id = parts[parts.length - 1].replace('.yaml', '');
                const templatePath = path.replace(id, 'plug');
                return { id, path, templatePath };
            });
    }

    public async getTemplateFile(moduleId: string, templatePath: string): Promise<{ path: string; content: string }> {
        const destinationRoot = resolve(this.sourceDirectory);
        const modulePath = resolve(destinationRoot, moduleId, templatePath);

        const contents = await readFile(modulePath, {
            encoding: 'utf-8',
        });

        return {
            path: templatePath,
            content: contents,
        }
    }
}