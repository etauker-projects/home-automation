import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TableComponent } from '../../components/table/table.component';
import type { TableAction, TableColumn, TableRow } from '../../components/table/table.interfaces';

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
  public actions: TableAction<Module>[];

  constructor(private router: Router) {
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
    ];
    this.actions = [
      {
        key: 'navigate',
        label: 'Navigate',
        handle: (row: TableRow<Module>) => {
          this.router.navigate(['/modules', row.id]);
        },
      },
    ];
  }
}
