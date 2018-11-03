import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ContextMenuDescriptor } from './context-menu-descriptor';

@Injectable()
export class ContextMenuService {
  showSubject = new Subject<ContextMenuDescriptor>();

  show(descriptor: ContextMenuDescriptor): void {
    this.showSubject.next(descriptor);
  }
}
