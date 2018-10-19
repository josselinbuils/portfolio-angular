import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ContextMenuDescriptor } from './context-menu-descriptor';

@Injectable()
export class ContextMenuService {
  showSubject: Subject<any> = new Subject<any>();

  show(descriptor: ContextMenuDescriptor): void {
    this.showSubject.next(descriptor);
  }
}
