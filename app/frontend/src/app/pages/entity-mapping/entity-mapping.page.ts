import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-entity-mapping-page',
    standalone: true,
    imports: [TableComponent, ReactiveFormsModule],
    templateUrl: './entity-mapping.page.html',
    styleUrl: './entity-mapping.page.css'
})
export class EntityMappingPage {
    form: FormGroup;

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
