import { Subject } from 'rxjs';

export class Renderable extends Subject<void> {
  dirty: boolean;

  constructor() {
    super();
  }

  decorateProperties(): void {
    for (const [key, startValue] of Object.entries(this)) {
      let value = startValue;

      Object.defineProperty(this, key, {
        get(): any {
          return value;
        },
        set(newValue: any): void {
          value = newValue;

          if (value !== undefined && value !== null && typeof value.subscribe === 'function') {
            value.subscribe(() => this.dirty = true);
          }

          this.dirty = true;
          this.next();
        },
      });
    }
    this.dirty = true;
  }
}
