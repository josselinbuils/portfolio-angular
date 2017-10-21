import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BashErrorComponent } from './bash-error.component';

describe('BashErrorComponent', () => {
  let component: BashErrorComponent;
  let fixture: ComponentFixture<BashErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BashErrorComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BashErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
