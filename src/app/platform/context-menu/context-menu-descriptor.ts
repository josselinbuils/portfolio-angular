import { ContextMenuItem } from './context-menu-item';

export interface ContextMenuDescriptor {
  event: MouseEvent;
  items: ContextMenuItem[];
  position?: { left: number; top: number };
  style?: any;
}
