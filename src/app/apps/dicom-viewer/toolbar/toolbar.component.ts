import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatasetDescriptor } from 'app/apps/dicom-viewer/config/dataset-descriptor';
import { MouseTool } from 'app/apps/dicom-viewer/constants';
import { MouseButton } from 'app/constants';

@Component({
  selector: 'app-dicom-viewer-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  @Input() activeLeftTool: MouseTool;
  @Input() activeRightTool: MouseTool;
  @Input() dataset: DatasetDescriptor;

  @Output() toolSelected = new EventEmitter<{ button: MouseButton; tool: MouseTool }>();

  readonly paging = MouseTool.Paging;
  readonly pan = MouseTool.Pan;
  readonly windowing = MouseTool.Windowing;
  readonly zoom = MouseTool.Zoom;

  getCssClass(tool: MouseTool): object {
    return {
      'active-left': this.activeLeftTool === tool,
      'active-right': this.activeRightTool === tool,
    };
  }

  selectLeftTool(tool: MouseTool): void {
    const button = MouseButton.Left;
    this.toolSelected.emit({ button, tool });
  }

  selectRightTool(tool: MouseTool): boolean {
    const button = MouseButton.Right;
    this.toolSelected.emit({ button, tool });
    return false;
  }
}
