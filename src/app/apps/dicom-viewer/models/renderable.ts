import { Subject } from 'rxjs';

export class Renderable {
  onUpdate: Subject<void>;

  private dirty: boolean;

  decorateProperties(): void {
    for (const [key, startValue] of Object.entries(this)) {
      let value = startValue;

      Object.defineProperty(this, key, {
        get(): any {
          return value;
        },
        set(newValue: any): void {
          value = newValue;

          if (value !== undefined && value.onUpdate instanceof Subject) {
            value.onUpdate.subscribe(() => this.makeDirty());
          }
          this.makeDirty();
        },
      });
    }
    this.dirty = true;
    this.onUpdate = new Subject();
  }

  isDirty(): boolean {
    return this.dirty;
  }

  makeClean(): void {
    this.dirty = false;

    for (const propertyValue of Object.values(this)) {
      if (propertyValue !== undefined && typeof propertyValue.makeClean === 'function') {
        propertyValue.makeClean();
      }
    }
  }

  private makeDirty(): void {
    this.dirty = true;
    this.onUpdate = new Subject();
  }
}
