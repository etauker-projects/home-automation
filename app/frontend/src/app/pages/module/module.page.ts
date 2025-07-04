import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import { ActivatedRoute, Router } from '@angular/router';
import type { TableAction, TableColumn, TableRow } from '../../components/table/table.interfaces';
import { RestService } from '../../services/rest/rest.service';
import type { EntityMetadata } from './module.interfaces';

@Component({
    selector: 'app-module-page',
    standalone: true,
    imports: [TableComponent],
    providers: [RestService],
    templateUrl: './module.page.html',
    styleUrl: './module.page.css'
})
export class ModulePage {

    //   public templateColumns: TableColumn<TemplateMetadata>[];
    //   public templateRows: TableRow<TemplateMetadata>[] = [];

    public entityMappingColumns: TableColumn<EntityMetadata>[];
    public entityMappingRows: TableRow<EntityMetadata>[] = [];
    public entityMappingActions: TableAction<EntityMetadata>[] = [];

    private moduleId?: string;

    constructor(private route: ActivatedRoute, private router: Router, private rest: RestService) {

        this.route.paramMap.subscribe(async params => {
            this.moduleId = params.get('moduleId') ?? undefined;

            if (this.moduleId) {
                // this.templateRows = await this.rest.getTemplateFiles(this.moduleId);

                const templates = await this.rest.getTemplateFiles(this.moduleId);
                const promises = templates.map(template => this.rest.getEntityFiles(this.moduleId!, template.id));
                this.entityMappingRows = (await Promise.all(promises)).flat();
            }
        });

        // this.templateColumns = [
        //   // { key: 'id', label: 'ID' },
        //   { key: 'id', label: 'ID' },
        //   { key: 'type', label: 'type' },
        // ];

        // Second table data
        this.entityMappingColumns = [
            { key: 'id', label: 'Entity' },
            { key: 'templateId', label: 'Template' },
            { key: 'type', label: 'Type' },
            { key: 'managed', label: 'Managed' },
        ];

        this.entityMappingActions = [
            // {
            //     key: 'navigate',
            //     label: 'Details',
            //     // icon: 'navigate',
            //     handle: (row: TableRow<EntityMetadata>) => {
            //         this.router.navigate(['/modules', this.moduleId, 'templates', row.templateId, 'entities', row.id]);
            //     },
            // },
            {
                key: 'edit',
                label: 'Edit',
                // icon: 'edit',
                handle: (row: TableRow<EntityMetadata>) => {
                    this.router.navigate(
                        ['/modules', this.moduleId, 'templates', row.templateId, 'entities', row.id],
                        { state: { variables: row.variables } }
                    );
                },
            },
            {
                key: 'delete',
                label: 'Delete',
                // icon: 'delete',
                handle: async (row: TableRow<EntityMetadata>) => {
                    console.log('Delete handle for row:', row);
                    // this.rest.deleteEntityFile
                },
            },
        ];
    }

    onAdd(): void {
        this.router.navigate(
            ['/modules', this.moduleId, 'templates'],
        );
    }
}
