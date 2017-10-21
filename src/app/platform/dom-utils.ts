export class DOMUtils {
  static getParent(element: HTMLElement, selector: string): HTMLElement {
    do {
      if ((<any> element).matches(selector)) {
        return element;
      }
    } while (element = element.parentElement);
    return null;
  }
}
