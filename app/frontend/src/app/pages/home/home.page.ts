import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import type { TableColumn, TableRow } from '../../components/table/table.interfaces';

interface Module {
  id: string;
  key: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  public columns: TableColumn<Module>[];
  public rows: TableRow<Module>[];

  constructor() {
    this.columns = [
      { key: 'id', label: 'ID' },
      { key: 'key', label: 'Key' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
    ];
    this.rows = [
      {
        id: '64bbfded-59ad-48d6-a60c-a0cc072ef88c',
        key: 'power_monitoring',
        name: 'Power Monitoring',
        description: 'Module for monitoring power consumption of devices',
      },
      {
        id: '0305df92-d242-49d8-adfb-be0c224d8f19',
        key: 'climate_control',
        name: 'Climate Control',
        description: 'Module for managing heating and cooling systems',
      },
    ];
  }
}
