export class DOMUtils {
  /**
   * Gets the first element that matches the selector by testing the element itself and traversing up through its
   * ancestors in the DOM tree.
   *
   * @see {@link https://api.jquery.com/closest|jQuery documentation}
   *
   * @param element Element to check first
   * @param selector Selector to find
   * @returns Element if found, null otherwise
   */
  static closest(element: HTMLElement, selector: string): HTMLElement {
    do {
      if (element.matches(selector)) {
        return element;
      }
      element = element.parentElement;
    } while (element instanceof HTMLElement);

    return undefined;
  }
}
