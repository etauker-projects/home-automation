import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffEditorComponent } from './diff-editor.component';

describe('DiffEditorComponent', () => {
  let component: DiffEditorComponent;
  let fixture: ComponentFixture<DiffEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DiffEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
