import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';
import type { TableColumn, TableRow } from '../../components/table/table.interfaces';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  public columns: TableColumn<any>[];
  public rows: TableRow<any>[];

  constructor() {
    this.columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' }
    ];

    this.rows = [
      { id: 1, name: 'Device 1', status: 'Online' },
      { id: 2, name: 'Device 2', status: 'Offline' },
      { id: 3, name: 'Device 3', status: 'Online' }
    ];
  }
}
