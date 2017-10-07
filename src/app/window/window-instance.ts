export class WindowInstance {
  static iconClass: string;
  active = false;
  id: number;

  getIconClass(): string {
    return (<any> this.constructor).iconClass;
  }
}
