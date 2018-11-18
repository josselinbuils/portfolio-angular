import { Subject } from 'rxjs';

export class Renderable {
  dirty: boolean;
  onUpdate: Subject<void>;

  decorateProperties(): void {
    for (const [key, startValue] of Object.entries(this)) {
      let value = startValue;

      Object.defineProperty(this, key, {
        get(): any {
          return value;
        },
        set(newValue: any): void {
          value = newValue;

          if (value !== undefined && value !== null && value.onUpdate instanceof Subject) {
            value.onUpdate.subscribe(() => this.dirty = true);
          }

          this.dirty = true;
          this.onUpdate.next();
        },
      });
    }
    this.dirty = true;
    this.onUpdate = new Subject();
  }
}
