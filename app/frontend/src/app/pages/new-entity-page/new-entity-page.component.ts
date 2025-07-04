import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-new-entity-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './new-entity-page.component.html',
    styleUrl: './new-entity-page.component.css'
})
export class NewEntityPageComponent {

    moduleId?: string;
    form: FormGroup;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formBuilder: FormBuilder,
    ) {
        this.form = this.formBuilder.group({
            templateId: new FormControl('', Validators.required),
            entityId: new FormControl('', Validators.required)
        });
        this.route.paramMap.subscribe(async params => {
            this.moduleId = params.get('moduleId') ?? undefined;
        });


    }


    onSubmit() {
        if (this.form.valid) {
            const { templateId, entityId } = this.form.value;
            this.router.navigate(
                ['/modules', this.moduleId, 'templates', templateId.trim(), 'entities', entityId.trim() ],
            );
        }
    }


}
