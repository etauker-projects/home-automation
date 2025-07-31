import { resolve } from 'path';
import { readFile, readdir, rm, writeFile, stat } from 'fs/promises';
import type { AppConfiguration } from '../../app';
import type { EntityFile, EntityMetadata, Module, TemplateFile, TemplateMetadata } from './module.interfaces';
import type { Identifier, MetaResponse } from '../metadata/metadata.interfaces';
import { LogService } from '../../microservice/logs/log.service';
import { DomainError } from '../../microservice/api/domain.error';


export class ModuleService {

    private sourceDirectory: string;
    private destinationDirectory: string;

    constructor(appconfig: AppConfiguration, private logger: LogService) {
        this.sourceDirectory = appconfig.inputDirectory;
        this.destinationDirectory = appconfig.outputDirectory;
    }

    public async getTemplateFile(id: Identifier, meta: TemplateMetadata): Promise<TemplateFile> {
        const path = this.formatPath(id.moduleKey, id.type, 'template');
        const fullpath = resolve(this.sourceDirectory, path.substring(1));
        const contents = await readFile(fullpath, { encoding: 'utf-8' });
        return { ...meta, content: contents };
    }

    public async entityFileExists(moduleKey: string, templateType: string, meta: EntityMetadata): Promise<boolean> {
        const path = this.formatPath(moduleKey, templateType, meta.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1), '..');
        const contents = (await readdir(fullpath)).map(file => file.toLocaleLowerCase());
        this.logger.debug(fullpath, '', contents);
        return contents.includes(`${meta.id.toLocaleLowerCase()}.yaml`);
    }

    public async ensureEntityFileDoesNotExist(moduleKey: string, templateType: string, meta: EntityMetadata): Promise<void> {
        const path = this.formatPath(moduleKey, templateType, meta.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));
        const basepath = resolve(fullpath, '..');
        const contents = (await readdir(basepath)).map(file => file.toLocaleLowerCase());

        if (contents.includes(`${meta.id.toLocaleLowerCase()}.yaml`)) {
            this.logger.debug(basepath, '', contents);
            throw new DomainError(409, `Entity file exists for '${fullpath} (case insensitive)`);
        }
    }

    public async getEntityFile(moduleKey: string, templateType: string, meta: EntityMetadata): Promise<EntityFile> {
        const path = this.formatPath(moduleKey, templateType, meta.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));
        const contents = await readFile(fullpath, { encoding: 'utf-8' });
        return { ...meta, content: contents };
    }

    public async saveEntityFile(moduleKey: string, templateType: string, file: EntityFile): Promise<EntityFile> {
        const path = this.formatPath(moduleKey, templateType, file.id);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));

        try {
            this.logger.trace(`Attempting to write conetnts to file ${fullpath}`);
            await readFile(fullpath, { encoding: 'utf-8' });
            throw new Error(`File already exists: ${fullpath}`);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                await writeFile(fullpath, file.content, { encoding: 'utf-8', flag: 'wx' });
                delete file.content;
                return file;
            }
            throw err;
        }
    }

    public async deleteEntityFile(moduleKey: string, templateType: string, entityId: string): Promise<void> {
        const path = this.formatPath(moduleKey, templateType, entityId);
        const fullpath = resolve(this.destinationDirectory, path.substring(1));
        await rm(fullpath, { maxRetries: 3 });
    }

    private formatPath(moduleId: string, entityType: string, id: string): string {
        return `/${moduleId}/${entityType}/${id}.yaml`;
    }

}