import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EditorComponent } from '../../components/editor/editor.component';
import { NGX_MONACO_EDITOR_CONFIG } from 'ngx-monaco-editor-v2';
import { DiffEditorComponent } from '../../components/diff-editor/diff-editor.component';

@Component({
    selector: 'app-entity-mapping-page',
    standalone: true,
    imports: [TableComponent, ReactiveFormsModule, FormsModule, EditorComponent, DiffEditorComponent],
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
    form: FormGroup;
    template = `
\${ inputs.id }_energy_usage_hourly:
    name: \${ inputs.name } Energy Usage Hourly
    source: sensor.\${ inputs.id }_energy
    cycle: hourly
    unique_id: meter.\${ inputs.id }_energy_usage_hourly
    offset: 0
    delta_values: false
\${ inputs.id }_energy_usage_daily:
    name: \${ inputs.name } Energy Usage Daily
    source: sensor.\${ inputs.id }_energy
    cycle: daily
    unique_id: meter.\${ inputs.id }_energy_usage_daily
    offset: 0
    delta_values: false
\${ inputs.id }_energy_usage_monthly:
    name: \${ inputs.name } Energy Usage Monthly
    source: sensor.\${ inputs.id }_energy
    cycle: monthly
    unique_id: meter.\${ inputs.id }_energy_usage_monthly
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
    }

    onSubmit() {
        if (this.form.valid) {
            console.log('Form submitted:', this.form.value);
            // Add logic to handle the new mapping here
            // this.form.reset();
        }
    }
}
