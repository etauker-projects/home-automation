import { parse, stringify } from 'yaml';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../components/table/table.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, type FormControl } from '@angular/forms';
// import { ActivatedRoute } from '@angular/router';
import { EditorComponent } from '../../components/editor/editor.component';
import { NGX_MONACO_EDITOR_CONFIG } from 'ngx-monaco-editor-v2';
import { DiffEditorComponent } from '../../components/diff-editor/diff-editor.component';

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

    form: FormGroup;

    controls: {
        id: string;
        label: string;
        readonly: boolean;
        control: FormControl;
    }[];

    previews: {
        title: string,
        template: string,
        output: string,
    }[] = [];

    // TODO: fetch from the backend
    template = `
\${ input.id }_energy_usage_hourly:
    name: \${ input.name } Energy Usage Hourly
    source: sensor.\${ input.id }_energy
    cycle: hourly
    unique_id: meter.\${ input.id }_energy_usage_hourly
    offset: 0
    delta_values: false
\${ input.id }_energy_usage_daily:
    name: \${ input.name } Energy Usage Daily
    source: sensor.\${ input.id }_energy
    cycle: daily
    unique_id: meter.\${ input.id }_energy_usage_daily
    offset: 0
    delta_values: false
\${ input.id }_energy_usage_monthly:
    name: \${ input.name } Energy Usage Monthly
    source: sensor.\${ input.id }_energy
    cycle: monthly
    unique_id: meter.\${ input.id }_energy_usage_monthly
    offset: 0
    delta_values: false
    `.trim();

    constructor(
        // private route: ActivatedRoute,
        private formBuilder: FormBuilder,
    ) {

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
        ];

        this.form = this.formBuilder.group([]);
        variables.forEach(variable => this.appendToForm(variable));

        // this.route.paramMap.subscribe(params => {
            // const moduleId = params.get('moduleId') ?? '';
            // this.form.controls['module'].setValue(moduleId);

            // const entityId = params.get('entityId') ?? undefined;
            // this.form.controls['sourceEntityId'].setValue(entityId);
        // });
    }

    private appendToForm(variable: string): void {
        if (!this.controls.some(control => control.id === variable)) {
            this.controls.push({
                id: variable,
                label: this.toHumanReadable(variable),
                readonly: false,
                control: this.formBuilder.control('', Validators.required),
            });
        }
        if (!this.form.contains(variable)) {
            this.form.addControl(variable, this.formBuilder.control('', Validators.required));
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

            // TODO: handle case where entities is an array
            this.previews = Object.keys(entities).map(key => {

                const json: { [key: string]: any } = {};
                json[key] = entities[key];
                const node = parse(JSON.stringify(json));
                const template = stringify(node, { indent: 4 });
                const title = this.extractTitle(entities[key], key);

                const variables = this.getVariableValues(this.controls);

                return {
                    title: title,
                    template: template,
                    output: this.substitueVariables(template, variables),
                };
            });
        }
    }
    private getVariableValues(controls: { id: string; label: string; readonly: boolean; control: FormControl; }[]): { [key: string]: string } {
        return controls.reduce((acc, control) => {
            acc[control.id] = control.control.value;
            return acc;
        }, {} as { [key: string]: string });
    }

    private toHumanReadable(id: string): string {
        const withSpaces = id.replace(/_/g, ' ');
        return withSpaces.substring(0, 1).toUpperCase() + withSpaces.substring(1);
    }
}
