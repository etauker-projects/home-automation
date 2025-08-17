import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, type SimpleChanges } from '@angular/core';
import type { TableAction, TableColumn, TableRow } from './table.interfaces';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent<T extends { [key: string]: any }> implements OnChanges {

  @Input() columns: TableColumn<T>[] = [];
  @Input() rows: TableRow<T>[] = [];
  @Input() actions: TableAction<T>[] = [];

  private ACTION_COLUMN = { key: 'actions', label: 'Actions' };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['actions']?.currentValue && !this.columns.some(c => c.key === this.ACTION_COLUMN.key)) {
      this.columns.push(this.ACTION_COLUMN);
    }
  }

  onActionClick(action: TableAction<T>, row: TableRow<T>) {
    if (action && typeof action.handle === 'function') {
      action.handle(row);
    }
  }

  onEnabledCheck(action: TableAction<T>, row: TableRow<T>) {
    if (action && typeof action.enabled === 'function') {
      return action.enabled(row);
    }
    return true;
  }
}
