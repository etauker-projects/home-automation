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
        const moduleDirectory = resolve(this.sourceDirectory);
        const metadataPath = resolve(moduleDirectory, '.metadata.json');
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);

        const items = await readdir(moduleDirectory, {
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
}