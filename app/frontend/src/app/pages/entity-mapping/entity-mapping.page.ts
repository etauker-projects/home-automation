import { parse , stringify } from 'yaml';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../components/table/table.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
    entities: {
        title: string,
        template: string,
        output: string,
        variables: Set<string>;
    }[];

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

    output = `
office_desk_plug_energy_usage_hourly:
    name: Office Desk Plug Energy Usage Hourly
    source: sensor.office_desk_plug_energy
    cycle: hourly
    unique_id: meter.office_desk_plug_energy_usage_hourly
    offset: 0
    delta_values: false
office_desk_plug_energy_usage_daily:
    name: Office Desk Plug Energy Usage Daily
    source: sensor.office_desk_plug_energy
    cycle: daily
    unique_id: meter.office_desk_plug_energy_usage_daily
    offset: 0
    delta_values: false
office_desk_plug_energy_usage_monthly:
    name: Office Desk Plug Energy Usage Monthly
    source: sensor.office_desk_plug_energy
    cycle: monthly
    unique_id: meter.office_desk_plug_energy_usage_monthly
    offset: 0
    delta_values: false
    `.trim();

    constructor(
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
    ) {
        this.form = this.formBuilder.group({
            module: ['power_monitoring', Validators.required],
            id: [''],
            sourceEntityId: ['sensor.office_desk_plug', Validators.required],
            templateSourcePath: ['/power_monitoring/template_sensor/plug.yaml', Validators.required],
            templateDestinationPath: ['/power_monitoring/template_sensor/office_desk_plug.yaml', Validators.required],
        });

        this.route.paramMap.subscribe(params => {
            // const moduleId = params.get('moduleId') ?? '';
            // this.form.controls['module'].setValue(moduleId);

            // const entityId = params.get('entityId') ?? undefined;
            // this.form.controls['sourceEntityId'].setValue(entityId);
        });

        const entities = parse(this.template);
        console.log('Parsed template entities:', entities);

        // TODO: handle case where entities is an array
        this.entities = Object.keys(entities).map(key => {

            const json: { [key: string]: any } = {};
            json[key] = entities[key];
            const node = parse(JSON.stringify(json));
            const template = stringify(node, { indent: 4 });

            const variables = this.extractVariables(template);
            const title = this.extractTitle(entities[key], key, variables);

            // TODO: get from user input
            const variablesMap: { [key: string]: string } = {
                id: 'office_desk_plug',
                name: 'Office Desk Plug',
            };

            return {
                title: title,
                template: template,
                output: this.substitueVariables(template, variablesMap),
                variables: variables,
            };
        });
    }
    extractTitle(json: { [key: string]: string }, key: string, variables: Set<string>): string {
        let name = json['name'] ?? key;
        variables.forEach(variable => name = name.replaceAll(variable, ''));
        name = name.startsWith('_') ? name.substring(1) : name;
        name = name.endsWith('_') ? name.substring(0, name.length-1) : name;
        return name.trim();
    }

    // TODO
    extractVariables(template: string): Set<string> {



        // const templateFileContent = templatePromises.map(async templateName => {
        //     const path = resolve(moduleDirectory, templateName);
        //     const content = await readFile(path, 'utf-8');
        const variables = new Set<string>();
        const regex = new RegExp(this.regexString.replace('KEY', '(?<input>[a-zA-Z0-9]+)'), 'g');
        const matches = template.matchAll(regex);
        console.log('Matches found:', matches, template, regex);

        for (const match of matches) {
            if (match.groups?.['input']) {
                // variables[key] = (match.groups?.['input']);
                // console.log('Found variable:', match.groups?.['input']);
                variables.add(match.groups?.['input']);

            }
        }

        return variables;

    }

    substitueVariables(template: string, variables: { [key: string]: string }): string {
        let result = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(this.regexString.replace('KEY', key), 'g');
            result = result.replaceAll(regex, variables[key])
        });
        return result;
    }

    onSubmit() {
        if (this.form.valid) {
            console.log('Form submitted:', this.form.value);
            // Add logic to handle the new mapping here
            // this.form.reset();
        }
    }
}
