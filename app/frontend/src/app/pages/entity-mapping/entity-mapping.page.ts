import { parse, stringify } from 'yaml';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../components/table/table.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, type FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EditorComponent } from '../../components/editor/editor.component';
import { NGX_MONACO_EDITOR_CONFIG } from 'ngx-monaco-editor-v2';
import { DiffEditorComponent } from '../../components/diff-editor/diff-editor.component';
import { RestService } from '../../services/rest/rest.service';
import type { EntityFile } from '../module/module.interfaces';

export interface Control {
    id: string;
    label: string;
    readonly: boolean;
    control: FormControl;
}

@Component({
    selector: 'app-entity-mapping-page',
    standalone: true,
    imports: [CommonModule, TableComponent, ReactiveFormsModule, FormsModule, EditorComponent, DiffEditorComponent],
    templateUrl: './entity-mapping.page.html',
    styleUrl: './entity-mapping.page.css',
    providers: [
        {
            provide: NGX_MONACO_EDITOR_CONFIG,
            useValue: {
                baseUrl: '', // <-- updated to match actual loader.js location
                defaultOptions: { theme: 'vs-dark', automaticLayout: true }
            }
        }
    ],
})
export class EntityMappingPage {
    private readonly regexString = '\\${\\s*input\\.KEY\\s*}';

    private moduleId?: string;
    private templateId?: string;
    private templateType?: string;
    private entityId?: string;

    form: FormGroup;

    controls: Control[] = [];

    previews: {
        title: string,
        template: string,
        output: string,
        variables: { [key: string]: string },
    }[] = [];

    template = '';

    constructor(
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private rest: RestService,
    ) {

        this.form = this.formBuilder.group([]);
        this.route.paramMap.subscribe(async params => {
            this.moduleId = params.get('moduleId') ?? undefined;
            this.templateId = params.get('templateId') ?? undefined;
            this.entityId = params.get('entityId') ?? undefined;

            if (this.moduleId && this.templateId && this.entityId) {

                rest.getTemplateFile(this.moduleId, this.templateId).then((data) => {
                    this.template = data.content;
                    this.templateType = data.type;
                    const variables = this.extractVariables(this.template);

                    // TODO: split module and entity info into separate forms
                    this.controls = [
                        // {
                        //     id: 'module',
                        //     label: 'Module',
                        //     readonly: true,
                        //     control: this.formBuilder.control('power_monitoring', Validators.required),
                        // },
                        // {
                        //     id: 'sourceEntityId',
                        //     label: 'Source Entity ID',
                        //     readonly: true,
                        //     control: this.formBuilder.control('sensor.office_desk_plug', Validators.required),
                        // },
                        // {
                        //     id: 'templateSourcePath',
                        //     label: 'Template Source Path',
                        //     readonly: true,
                        //     control: this.formBuilder.control('/power_monitoring/template_sensor/plug.yaml', Validators.required),
                        // },
                        // {
                        //     id: 'templateDestinationPath',
                        //     label: 'Template Destination Path',
                        //     readonly: true,
                        //     control: this.formBuilder.control('/power_monitoring/template_sensor/office_desk_plug.yaml', Validators.required),
                        // },

                        // standard variables for all templates
                        {
                            id: 'name',
                            label: 'Name',
                            readonly: false,
                            control: this.formBuilder.control('', Validators.required),
                        },
                        {
                            id: 'id',
                            label: 'Id',
                            readonly: false,
                            control: this.formBuilder.control('', Validators.required),
                        },
                    ];

                    variables.forEach(variable => this.appendToForm(variable));

                    // convenience: pre-fill ID based on the entered name
                    this.form.get('name')?.valueChanges.subscribe((value: string) => {
                        if (value) {
                            this.form.controls['id'].setValue(value.toLowerCase().replace(/ /g, '_'));
                        }
                    });

                });
            }

        });
    }

    private appendToForm(variable: string | Control): void {
        const control = typeof variable === 'string' ? {
            id: variable,
            label: this.toHumanReadable(variable),
            readonly: false,
            control: this.formBuilder.control('', Validators.required),
        } : variable;

        if (!this.controls.some(c => c.id === control.id)) {
            this.controls.push(control);
        }
        if (!this.form.contains(control.id)) {
            this.form.addControl(control.id, control.control);
        }
    }

    // TODO: move to service
    private extractTitle(json: { [key: string]: string }, key: string): string {
        const regex = new RegExp(this.regexString.replace('KEY', '(?<input>[a-zA-Z0-9]+)'), 'g');
        const name = (json['name'] ?? key).replaceAll(regex, '');
        return this.toHumanReadable(name);
    }

    // TODO: move to service
    private extractVariables(template: string): Set<string> {
        const variables = new Set<string>();
        const regex = new RegExp(this.regexString.replace('KEY', '(?<input>[a-zA-Z0-9]+)'), 'g');
        const matches = template.matchAll(regex);
        for (const match of matches) {
            if (match.groups?.['input']) {
                variables.add(match.groups?.['input']);
            }
        }
        return variables;
    }

    // TODO: move to service
    private substitueVariables(template: string, variables: { [key: string]: string }): string {
        let result = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(this.regexString.replace('KEY', key), 'g');
            result = result.replaceAll(regex, variables[key])
        });
        return result;
    }

    onSubmit() {
        if (this.form.valid) {
            const entities = parse(this.template);

            if (!entities) {
                console.warn('No entities found in the template file');
                this.previews = [];
            } else if (Array.isArray(entities)) {
                this.previews = entities.map((entity, index) => {

                    const node = parse(JSON.stringify(entity));
                    const template = stringify(node, { indent: 4 });
                    const title = this.extractTitle(entity, `${index}`);
                    const variables = this.getFormValues();

                    return {
                        title: title,
                        template: template,
                        output: this.substitueVariables(template, variables),
                        variables,
                    };

                });
            } else if (typeof entities === 'object') {
                this.previews = Object.keys(entities).map(key => {

                    const json: { [key: string]: any } = {};
                    json[key] = entities[key];
                    const node = parse(JSON.stringify(json));
                    const template = stringify(node, { indent: 4 });
                    const title = this.extractTitle(entities[key], key);

                    const variables = this.getFormValues();

                    return {
                        title: title,
                        template: template,
                        output: this.substitueVariables(template, variables),
                        variables,
                    };

                });
            }
        }
    }

    onSave() {

        if (this.previews.length === 0) {
            console.warn('No previews to save');
            return;
        }

        const str = stringify(this.previews.map(preview => parse(preview.output)), { indent: 4 });

        console.log('Saving string:', str);
        const file: EntityFile = {
            id: this.entityId!,
            templateId: this.templateId!,
            type: this.templateType!,
            managed: true,
            variables: this.previews.reduce((vars, preview) => ({ ...vars, ...preview.variables }), {}),
            content: str,
        }

        this.rest.postEntityFile(this.moduleId!, this.templateId!, file).then(() => {
            console.log('Entity file saved successfully');
        });
    }

    private getFormValues(): { [key: string]: string } {
        return Object.keys(this.form.controls).reduce((acc, key) => {
            acc[key] = this.form.controls[key].value;
            return acc;
        }, {} as { [key: string]: string });
    }

    private toHumanReadable(id: string): string {
        const withSpaces = id.replace(/_/g, ' ');
        return withSpaces.substring(0, 1).toUpperCase() + withSpaces.substring(1);
    }
}
