import { Renderer2 } from '@angular/core';
import { MouseButton } from 'app/constants';

import { MouseTool } from '../constants';
import { Viewport } from '../models';

import { startPaging, startPan, startRotate, startWindowing, startZoom } from './tools';

export class Toolbox {
  private activeLeftTool = MouseTool.Paging;
  private activeRightTool = MouseTool.Zoom;

  constructor(private readonly viewport: Viewport,
              private readonly viewportElement: HTMLElement,
              private readonly viewRenderer: Renderer2) {}

  getActiveTool(button: MouseButton): MouseTool {
    switch (button) {
      case MouseButton.Left:
        return this.activeLeftTool;
      case MouseButton.Right:
        return this.activeRightTool;
      default:
        throw new Error('Unknown button');
    }
  }

  selectActiveTool(combination: { button: MouseButton; tool: MouseTool }): void {
    const { button, tool } = combination;

    switch (button) {
      case MouseButton.Left:
        this.activeLeftTool = tool;
        break;
      case MouseButton.Right:
        this.activeRightTool = tool;
        break;
      default:
        throw new Error('Unknown button');
    }
  }

  startTool(downEvent: MouseEvent): void {
    downEvent.preventDefault();

    const isMacOS = navigator.platform.indexOf('Mac') !== -1;
    let tool: MouseTool;
    let cancelMouseMove: () => void;

    switch (downEvent.button) {
      case MouseButton.Left:
        tool = this.activeLeftTool;
        break;
      case MouseButton.Middle:
        tool = MouseTool.Pan;
        break;
      case MouseButton.Right:
        tool = this.activeRightTool;
        break;
      default:
        throw new Error('Unknown button');
    }

    let moveListener: ToolMoveListener;

    switch (tool) {
      case MouseTool.Paging:
        moveListener = startPaging(this.viewport, downEvent);
        break;
      case MouseTool.Pan:
        moveListener = startPan(this.viewport, downEvent);
        break;
      case MouseTool.Rotate:
        const viewportClientRect = this.viewportElement.getBoundingClientRect();
        moveListener = startRotate(this.viewport, downEvent, viewportClientRect);
        break;
      case MouseTool.Windowing:
        moveListener = startWindowing(this.viewport, downEvent);
        break;
      case MouseTool.Zoom:
        moveListener = startZoom(this.viewport, downEvent);
        break;
      default:
        throw new Error('Unknown tool');
    }

    cancelMouseMove = this.viewRenderer.listen('window', 'mousemove', moveListener);

    if ([MouseButton.Left, MouseButton.Middle].includes(downEvent.button) || isMacOS) {
      const cancelMouseUp = this.viewRenderer.listen('window', 'mouseup', () => {
        cancelMouseMove();
        cancelMouseUp();
      });
    }

    if (downEvent.button === MouseButton.Right && !isMacOS) {
      const cancelContextMenu = this.viewRenderer.listen('window', 'contextmenu', () => {
        cancelMouseMove();
        cancelContextMenu();
        return false;
      });
    }
  }
}

export type ToolMoveListener = (moveEvent: MouseEvent) => void;
