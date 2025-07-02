import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import { ActivatedRoute, Router } from '@angular/router';
import type { TableAction, TableColumn, TableRow } from '../../components/table/table.interfaces';
import { RestService } from '../../services/rest/rest.service';

interface Template {
  path: string;
}

interface EntityMapping {
  id: string;
  path: string;
  templatePath: string;
}


@Component({
  selector: 'app-module-page',
  standalone: true,
  imports: [TableComponent],
  providers: [RestService],
  templateUrl: './module.page.html',
  styleUrl: './module.page.css'
})
export class ModulePage {

  public templateColumns: TableColumn<Template>[];
  public templateRows: TableRow<Template>[] = [];

  public entityMappingColumns: TableColumn<EntityMapping>[];
  public entityMappingRows: TableRow<EntityMapping>[] = [];
  public entityMappingActions: TableAction<EntityMapping>[] = [];

  private moduleId?: string;

  constructor(private route: ActivatedRoute, private router: Router, private rest: RestService) {

    this.route.paramMap.subscribe(async params => {
        this.moduleId = params.get('moduleId') ?? undefined;

        if (this.moduleId) {
            const paths = await this.rest.getTemplateFiles(this.moduleId);
            this.templateRows = paths.map((path: string) => ({ path }));

            const mappings = await this.rest.getEntityFiles(this.moduleId);
            this.entityMappingRows = mappings;
        }
    });

    this.templateColumns = [
      // { key: 'id', label: 'ID' },
      { key: 'path', label: 'Path' },
    ];

    // Second table data
    this.entityMappingColumns = [
      { key: 'id', label: 'Entity' },
      { key: 'templatePath', label: 'Template' },
      { key: 'path', label: 'Path' },
    ];

    this.entityMappingActions = [
        {
            key: 'navigate',
            label: 'Details',
            // icon: 'navigate',
            handle: (row: TableRow<EntityMapping>) => {
                this.router.navigate(['/modules', this.moduleId, 'entities', row.id]);
            },
        },
        // {
        //     key: 'edit',
        //     label: 'Edit',
        //     // icon: 'edit',
        //     handle: (row: TableRow<EntityMapping>) => {
        //         console.log('Edit handle for row:', row);
        //     },
        // },
        // {
        //     key: 'delete',
        //     label: 'Delete',
        //     // icon: 'delete',
        //     handle: (row: TableRow<EntityMapping>) => {
        //         console.log('Delete handle for row:', row);
        //     },
        // },
    ];
  }
}
