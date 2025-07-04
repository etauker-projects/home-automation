import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewEntityPageComponent } from './new-entity-page.component';

describe('NewEntityPageComponent', () => {
  let component: NewEntityPageComponent;
  let fixture: ComponentFixture<NewEntityPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewEntityPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewEntityPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
