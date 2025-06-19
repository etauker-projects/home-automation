import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { TableColumn, TableRow } from './table.interfaces';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent<T extends { [key: string]: any }> {

  @Input() columns: TableColumn<T>[] = [];
  @Input() rows: TableRow<T>[] = [];

}
