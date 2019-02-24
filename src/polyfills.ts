/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/docs/ts/latest/guide/browser-support.html
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

// Polyfill.io Symbol polyfill does not seem work with RXJS in IE11 so use core-js one
import 'core-js/es6/symbol';
// Needed by Angular, included with Angular CLI.
import 'zone.js/dist/zone';

// Loads Polyfill.io polyfills after having loaded Symbol polyfill
loadPolyfills(['default', 'es5', 'es6', 'es7', 'Object.entries', 'Object.values']);

try {
  // tslint:disable-next-line:no-unused-expression
  new ImageData(1, 1);
} catch (error) {
  // tslint:disable-next-line:only-arrow-functions
  (window as any).ImageData = ImageDataPolyfill;
}

// ImageData constructor polyfill
function ImageDataPolyfill(data: Uint8ClampedArray, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('Unable to retrieve 2d context');
  }

  const imageData = context.createImageData(width, height);
  imageData.data.set(data);

  return imageData;
}

function loadPolyfills(features: string[]): void {
  const script = document.createElement('script');
  script.src = `https://polyfill.io/v3/polyfill.min.js?flags=gated&features=${features.join(',')}`;
  script.type = 'text/javascript';
  script.async = false;
  document.getElementsByTagName('head')[0].appendChild(script);
}
