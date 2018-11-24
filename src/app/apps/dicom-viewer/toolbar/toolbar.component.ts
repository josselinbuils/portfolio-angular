import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MouseButton } from 'app/constants';

import { MouseTool, ViewType } from '../constants';
import { Viewport } from '../models';

@Component({
  selector: 'app-dicom-viewer-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  @Input() activeLeftTool: MouseTool;
  @Input() activeRightTool: MouseTool;
  @Input() viewport: Viewport;

  @Output() toolSelected = new EventEmitter<{ button: MouseButton; tool: MouseTool }>();

  readonly MouseTool = MouseTool;
  readonly ViewType = ViewType;

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
