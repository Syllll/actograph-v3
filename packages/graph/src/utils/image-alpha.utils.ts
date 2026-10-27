/** Pixi render-texture readback is premultiplied; Canvas2D ImageData is straight RGBA. */
export function unpremultiplyRgba(pixels: Uint8Array | Uint8ClampedArray): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels);
  for (let index = 0; index < output.length; index += 4) {
    const alpha = output[index + 3]!;
    if (alpha === 255) continue;
    if (alpha === 0) {
      output[index] = output[index + 1] = output[index + 2] = 0;
      continue;
    }
    const multiplier = 255 / alpha;
    output[index] = Math.round(output[index]! * multiplier);
    output[index + 1] = Math.round(output[index + 1]! * multiplier);
    output[index + 2] = Math.round(output[index + 2]! * multiplier);
  }
  return output;
}
