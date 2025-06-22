import { Component } from '@angular/core';
import { TableComponent } from '../../components/table/table.component';

@Component({
  selector: 'app-entity-mapping-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './entity-mapping.page.html',
  styleUrl: './entity-mapping.page.css'
})
export class EntityMappingPage {

  constructor() {

  }
}
