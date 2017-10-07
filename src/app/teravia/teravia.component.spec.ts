import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TeraviaComponent } from './teravia.component';

describe('TeraviaComponent', () => {
  let component: TeraviaComponent;
  let fixture: ComponentFixture<TeraviaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TeraviaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeraviaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
