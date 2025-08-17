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
                await this.refreshList();
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
                enabled: (row: TableRow<EntityMetadata>) => row.managed,
                handle: (row: TableRow<EntityMetadata>) => {
                    if (!row.managed) {
                        console.warn('Unmanaged entity cannot be edited.')
                    } else {
                        this.router.navigate(
                            ['/modules', this.moduleId, 'templates', row.templateId, 'entities', row.id],
                            { state: { variables: row.variables } }
                        );
                    }
                },
            },
            {
                key: 'delete',
                label: 'Delete',
                // icon: 'delete',
                enabled: (row: TableRow<EntityMetadata>) => row.managed,
                handle: async (row: TableRow<EntityMetadata>) => {
                    if (!row.managed) {
                        console.warn('Unmanaged entity cannot be deleted.')
                    } else {
                        await this.rest.deleteEntityFile(this.moduleId!, row.templateId, row.id);
                        await this.refreshList();
                    }
                },
            },
        ];
    }

    onAdd(): void {
        this.router.navigate(
            ['/modules', this.moduleId, 'templates'],
        );
    }

    async refreshList(): Promise<void> {
        if (this.moduleId) {
            const templates = await this.rest.getTemplateFiles(this.moduleId);
            const promises = templates.map(template => this.rest.getEntityFiles(this.moduleId!, template.id));
            promises.push(this.rest.getUnmanagedEntityFiles(this.moduleId!));
            const managedAndUnmanaged = (await Promise.all(promises)).flat();

            // return true if entity is managed
            const isManaged = (current: EntityMetadata) => current.managed;

            // return true if entity does not have a managed counterpart
            const hasNoManagedCounterpart = (current: EntityMetadata, all: EntityMetadata[]) => {
                const hasManagedCounterpart = all.some(other => other.id === current.id && other.managed);
                return !hasManagedCounterpart;
            };

            this.entityMappingRows = managedAndUnmanaged
                .filter((current, _, all) => isManaged(current) || hasNoManagedCounterpart(current, all));
        }
    }
}
