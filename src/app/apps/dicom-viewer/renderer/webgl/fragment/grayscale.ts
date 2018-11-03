export const FORMATTER: { [imageFormat: string]: string } = {
  // High byte value always < 0.5 on signed numbers (most significant bit is used to store the sign)
  int8: 'texture.r - step(0.5, texture.r)',
  int16: '(texture.a - step(0.5, texture.a)) * 256.0 + texture.r',
  uint8: 'texture.r',
  uint16: 'texture.a * 256.0 + texture.r',
};

export const GRAYSCALE_FRAGMENT_SHADER_SRC = `
  precision mediump float;

  uniform float rescaleSlope;
  uniform float rescaleIntercept;
  uniform float windowWidth;
  uniform float windowLevel;

  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    vec4 texture = texture2D(u_image, v_texCoord);

    // Compute pixel raw value
    float intensity = (FORMATTER) * 256.0;

    // Apply rescale slope and intercept
    intensity = intensity * rescaleSlope + rescaleIntercept;

    // Apply windowing
    intensity = (intensity - windowLevel - 0.5) / windowWidth + 0.5;

    // Clamp intensity
    intensity = clamp(intensity, 0.0, 1.0);

    gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
  }
`;
