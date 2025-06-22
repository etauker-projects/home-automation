import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import type { TableColumn, TableRow } from '../../components/table/table.interfaces';

interface Template {
  id: string;
  path: string;
}

interface EntityMapping {
  id: string;
  module: string;
  sourceEntityId: string;
  templateDestinationPath: string;
  templateSourcePath: string;
}


@Component({
  selector: 'app-module-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './module.page.html',
  styleUrl: './module.page.css'
})
export class ModulePage {

  public templateColumns: TableColumn<Template>[];
  public templateRows: TableRow<Template>[];

  public entityMappingColumns: TableColumn<EntityMapping>[];
  public entityMappingRows: TableRow<EntityMapping>[];

  constructor() {

    // const templateInputPath = '/Users/etauker/workspace/etauker/home-automation/app/backend/templateSource';
    // const templateOutputPath = '/Users/etauker/workspace/etauker/home-automation/app/backend/templateDestination';

    this.templateColumns = [
      // { key: 'id', label: 'ID' },
      { key: 'path', label: 'Path' },
    ];

    this.templateRows = [
      // {
      //   id: '128ebda0-996d-4add-b777-99778956e1d8',
      //   path: '/Users/etauker/workspace/etauker/home-automation/app/backend/templateSource/power_monitoring/history_stats',
      // },
      // {
      //   id: 'b20d408c-e12a-464a-8428-43e361d64a87',
      //   path: '/Users/etauker/workspace/etauker/home-automation/app/backend/templateSource/power_monitoring/template_binary_sensor',
      // },
      {
        id: 'e06713d0-a475-4292-b83d-5d0fdafbbfea',
        path: '/power_monitoring/template_sensor/plug.yaml',
      },
      {
        id: '0045767f-9b1f-4dc1-844f-53a1d8b4bffc',
        path: '/power_monitoring/utility_meter/plug.yaml',
      },
    ];

    // Second table data
    this.entityMappingColumns = [
      { key: 'sourceEntityId', label: 'Entity ID' },
      { key: 'templateSourcePath', label: 'Input Path' },
      { key: 'templateDestinationPath', label: 'Output Path' },
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
      },
      {
        id: '4453c6c8-6f65-4b4d-8d8e-46d2a81047a0',
        sourceEntityId: 'sensor.office_desk_plug',
        module: 'power_monitoring',
        // templateSourcePath: templateInputPath + '/power_monitoring/utility_monitor/plug.yaml',
        // templateDestinationPath: templateOutputPath + '/power_monitoring/utility_monitor/office_desk_plug.yaml',
        templateSourcePath: '/power_monitoring/utility_monitor/plug.yaml',
        templateDestinationPath: '/power_monitoring/utility_monitor/office_desk_plug.yaml',
      },
    ];
  }
}
