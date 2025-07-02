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
  module: string;
  enabled: boolean;
  sourceEntityId: string;
  templateDestinationPath: string;
  templateSourcePath: string;
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
  public entityMappingRows: TableRow<EntityMapping>[];
  public entityMappingActions: TableAction<EntityMapping>[] = [];

  private moduleId?: string;

  constructor(private route: ActivatedRoute, private router: Router, private rest: RestService) {

    this.route.paramMap.subscribe(async params => {
        this.moduleId = params.get('moduleId') ?? undefined;

        if (this.moduleId) {
            const paths = await this.rest.getTemplateFiles(this.moduleId);
            this.templateRows = paths.map((path: string) => ({ path }));
        }
    });

    this.templateColumns = [
      // { key: 'id', label: 'ID' },
      { key: 'path', label: 'Path' },
    ];

    // Second table data
    this.entityMappingColumns = [
      { key: 'sourceEntityId', label: 'Entity ID' },
      { key: 'templateSourcePath', label: 'Template Path' },
      { key: 'templateDestinationPath', label: 'Output Path' },
      { key: 'enabled', label: 'Enabled' },
    ];
    this.entityMappingRows = [
      {
        id: 'ba8ea0b1-205a-432c-8dcc-2b6fa70036f4',
        sourceEntityId: 'sensor.office_desk_plug',
        module: 'power_monitoring',
        // templateSourcePath: templateInputPath + '/power_monitoring/template_sensor/plug.yaml',
        // templateDestinationPath: templateOutputPath + '/power_monitoring/template_sensor/office_desk_plug.yaml',
        templateSourcePath: '/power_monitoring/template_sensor/plug.yaml',
        templateDestinationPath: '/power_monitoring/template_sensor/office_desk_plug.yaml',
        enabled: true,
      },
      {
        id: '4453c6c8-6f65-4b4d-8d8e-46d2a81047a0',
        sourceEntityId: 'sensor.office_desk_plug',
        module: 'power_monitoring',
        // templateSourcePath: templateInputPath + '/power_monitoring/utility_monitor/plug.yaml',
        // templateDestinationPath: templateOutputPath + '/power_monitoring/utility_monitor/office_desk_plug.yaml',
        templateSourcePath: '/power_monitoring/utility_monitor/plug.yaml',
        templateDestinationPath: '/power_monitoring/utility_monitor/office_desk_plug.yaml',
        enabled: false,
      },
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
