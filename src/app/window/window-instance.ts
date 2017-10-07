export class WindowInstance {
  static iconClass: string;
  active = false;
  id: number;
  visible = true;

  getIconClass(): string {
    return (<any> this.constructor).iconClass;
  }
}
