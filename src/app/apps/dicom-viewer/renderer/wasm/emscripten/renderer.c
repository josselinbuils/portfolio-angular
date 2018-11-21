#include <math.h>
#include <stdint.h>

void fillTable(uint8_t *table, int windowWidth) {
  for (int i = 0; i < windowWidth; i++) {
    table[i] = (uint8_t) ((double) i / (double) windowWidth * 256.0);
  }
}

void render(
  uint8_t *table, int16_t *rawImageData, uint32_t *renderedImageData, double sliceWidth, double x0, double y0,
  int displayX0, int displayX1, int displayY0, int displayY1, double zoom, int leftLimit, int rightLimit,
  double rescaleSlope, int rescaleIntercept
) {
  int dataIndex = 0;

  for (double y = displayY0; y <= displayY1; y++) {
    for (double x = displayX0; x <= displayX1; x++) {
      int pixelDataIndex = (int) (round((y - y0) / zoom) * sliceWidth + (x - x0) / zoom);
      int rawValue = (int) (((double) rawImageData[pixelDataIndex]) * rescaleSlope) + rescaleIntercept;
      int intensity = 255;

      if (rawValue < leftLimit) {
        intensity = 0;
      } else if (rawValue < rightLimit) {
        intensity = table[rawValue - leftLimit];
      }

      renderedImageData[dataIndex++] = intensity | intensity << 8 | intensity << 16 | 255 << 24;
    }
  }
}
