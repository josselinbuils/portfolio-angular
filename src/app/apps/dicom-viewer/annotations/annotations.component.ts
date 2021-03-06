import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ContextMenuItem, ContextMenuService } from '@portfolio/platform/context-menu';

import { ViewType } from '../constants';
import { Annotations } from '../models/annotations';

const viewTypeSelectorStyle = {
  background: 'black',
  border: '1px solid white',
};

@Component({
  selector: 'app-dicom-viewer-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.scss'],
})
export class AnnotationsComponent {
  @Input() annotations!: Annotations;
  @Input() availableViewTypes!: ViewType[];

  @Output() viewType = new EventEmitter<ViewType>();

  @ViewChild('viewType') viewTypeElementRef!: ElementRef<HTMLParagraphElement>;

  constructor(private readonly contextMenuService: ContextMenuService) {}

  openViewTypeMenu(event: MouseEvent): void {
    const { bottom, left } = this.viewTypeElementRef.nativeElement.getBoundingClientRect();

    const items: ContextMenuItem[] = this.availableViewTypes
      .map(viewType => ({
        iconClass: viewType === this.annotations.viewType ? 'fa fa-check' : '',
        title: viewType,
        click: () => this.viewType.emit(viewType),
      }));

    this.contextMenuService.show({
      event,
      items,
      position: {
        left,
        top: bottom + 5,
      },
      style: viewTypeSelectorStyle,
    });
  }
}
