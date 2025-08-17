import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TableComponent } from '../../components/table/table.component';
import type { TableAction, TableColumn, TableRow } from '../../components/table/table.interfaces';
import { RestService } from '../../services/rest/rest.service';

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
  providers: [RestService],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  public columns: TableColumn<Module>[];
  public rows: TableRow<Module>[] = [];
  public actions: TableAction<Module>[] = [];

  constructor(private router: Router, private rest: RestService) {
    this.columns = [
      // { key: 'id', label: 'ID' },
      { key: 'key', label: 'Key' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
    ];

    this.rest.getModules().then((modules: Module[]) => {
      this.rows = modules;
      this.actions = [
        {
          key: 'navigate',
          label: 'Details',
          enabled: (row: TableRow<Module>) => true,
          handle: (row: TableRow<Module>) => {
            this.router.navigate(['/modules', row.id]);
          },
        },
      ];
    });
  }
}
