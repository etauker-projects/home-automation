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

    constructor(appconfig: AppConfiguration) {
        this.sourceDirectory = appconfig.inputDirectory;
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
}