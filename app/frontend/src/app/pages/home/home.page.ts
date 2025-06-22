import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import type { TableColumn, TableRow } from '../../components/table/table.interfaces';

interface Template {
  id: string;
  path: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  public columns: TableColumn<any>[];
  public rows: TableRow<Template>[];

  constructor() {

    // const templatePath = '/Users/etauker/workspace/etauker/home-automation/app/backend/templateSource';

    this.rows = [
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

    this.columns = [
      { key: 'id', label: 'ID' },
      { key: 'path', label: 'Path' },
    ];
  }
}
