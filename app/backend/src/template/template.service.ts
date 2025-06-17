import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile, readdir } from 'fs/promises';
import type { AppConfiguration } from '../app';

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Template {
    path: string;
    content: string;
}

export interface Module {
    module: string;
    templates: Template[];
    variables: Set<string>;
}

export class TemplateService {

    private templatePath: string;
    private readonly regexString = '\\${\\s*input\\.KEY\\s*}';

    constructor(appconfig: AppConfiguration) {
        this.templatePath = appconfig.inputDirectory;
    }

    public async loadModule(moduleId: string): Promise<Module> {
        const moduleDirectory = resolve(this.templatePath, moduleId);
        const templatePromises = await readdir(moduleDirectory);
        const variables = new Set<string>();
        const templates: Template[] = [];

        const templateFileContent = templatePromises.map(async templateName => {
            const path = resolve(moduleDirectory, templateName);
            const content = await readFile(path, 'utf-8');
            const regex = new RegExp(this.regexString.replace('KEY', '(?<input>[a-zA-Z0-9]+)'), 'g');
            const matches = content.matchAll(regex);

            for (const match of matches) {
                if (match.groups?.input) {
                    variables.add(match.groups?.input);
                }
            }

            templates.push({ path, content });
        });

        await Promise.all(templateFileContent);

        return {
            module: moduleId,
            templates,
            variables,
        };
    }

    public async prepareTemplate(template: string, inputs: { [key: string]: string }): Promise<string> {
        let replaced = template;
        Object.keys(inputs).forEach((key) => {
            const regex = new RegExp(this.regexString.replace('KEY', key), 'g');
            console.log(key, regex);
            replaced = replaced.replaceAll(regex, inputs[key]);
        });
        return replaced;
    }
}