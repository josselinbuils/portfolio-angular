export class DOMUtils {
  /**
   * Gets the first element that matches the selector by testing the element itself and traversing up through its
   * ancestors in the DOM tree.
   *
   * @see {@link https://api.jquery.com/closest|jQuery documentation}
   *
   * @param {HTMLElement} element Element to check first
   * @param {string} selector Selector to find
   * @returns {HTMLElement|null} Element if found, null otherwise
   */
  static closest(element: HTMLElement, selector: string): HTMLElement {

    do {
      if ((<any> element).matches(selector)) {
        return element;
      }
    } while (element = element.parentElement);

    return null;
  }
}
