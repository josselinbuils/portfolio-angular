#include <stdint.h>

void fillTable(uint8_t *table, int windowWidth, int invert) {
  if (invert == 0) {
    for (int i = 0; i < windowWidth; i++) {
      table[i] = (uint8_t) ((double) i / (double) windowWidth * 256.0);
    }
  } else {
    for (int i = 0; i < windowWidth; i++) {
     table[i] = (uint8_t) ((1.0 - (double) i / (double) windowWidth) * 256.0);
    }
  }
}

void render(
  uint8_t *table, int32_t *rawImageData, uint8_t *renderedImageData, int sliceWidth, int x0, int y0, int displayX0,
  int displayX1, int displayY0, int displayY1, double zoom, int leftLimit, int rightLimit, double rescaleSlope,
  int rescaleIntercept
) {
  int dataIndex = 0;

  for (int y = displayY0; y < displayY1; y++) {
    for (int x = displayX0; x < displayX1; x++) {
      int pixelDataIndex = (int) (((double) (y - y0)) / zoom) * ((double) sliceWidth) + (int) (((double) (x - x0)) / zoom);
      int rawValue = (int) ((double) rawImageData[pixelDataIndex] * rescaleSlope) + rescaleIntercept;
      int intensity = 0;

      if (rawValue >= rightLimit) {
        intensity = 255;
      } else if (rawValue > leftLimit) {
        intensity = table[rawValue - leftLimit];
      }

      renderedImageData[dataIndex++] = intensity;
      renderedImageData[dataIndex++] = intensity;
      renderedImageData[dataIndex++] = intensity;
      renderedImageData[dataIndex++] = 255;
    }
  }
}
