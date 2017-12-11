export class Int16FragmentShader {

  static src = `
    precision mediump float;

    uniform float rescaleSlope;
    uniform float rescaleIntercept;
    uniform float windowWidth;
    uniform float windowLevel;

    // Texture
    uniform sampler2D u_image;

    // Tex coordinates passed in from the vertex shader
    varying vec2 v_texCoord;

    void main() {
      vec4 texture = texture2D(u_image, v_texCoord);

      // Compute pixel raw value
      float intensity = (float(texture[0]) * 256.0 + float(texture[1])) * 256.0;

      // Apply sign
      intensity *= (float(texture[2]) * 256.0 - 1.0);

      // Apply rescale slope and intercept
      intensity = intensity * rescaleSlope + rescaleIntercept;

      // Apply windowing
      intensity = (intensity - windowLevel - 0.5) / windowWidth + 0.5;

      gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
    }
  `;

  static formatImageData(pixelData: Uint16Array, width: number, height: number): Uint8Array {
    const nbChannels = 3;
    const imageDataLength = width * height * nbChannels;
    const imageData = new Uint8Array(imageDataLength);

    let dataIndex = 0;

    for (let i = 0; i < imageDataLength; i++) {
      const rawValue = Math.abs(pixelData[i]);
      imageData[dataIndex++] = rawValue >> 8; // High bit
      imageData[dataIndex++] = rawValue & 0xff; // Low bit
      imageData[dataIndex++] = pixelData[i] > 0 ? 2 : 0; // Sign
    }

    return imageData;
  }
}
