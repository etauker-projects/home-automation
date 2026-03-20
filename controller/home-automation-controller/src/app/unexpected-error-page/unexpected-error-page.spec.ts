import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnexpectedErrorPage } from './unexpected-error-page';

describe('UnexpectedErrorPage', () => {
  let component: UnexpectedErrorPage;
  let fixture: ComponentFixture<UnexpectedErrorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnexpectedErrorPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UnexpectedErrorPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
