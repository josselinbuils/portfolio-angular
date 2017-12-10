import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DicomViewerComponent } from './dicom-viewer.component';

describe('DicomViewerComponent', () => {
  let component: DicomViewerComponent;
  let fixture: ComponentFixture<DicomViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DicomViewerComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DicomViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
