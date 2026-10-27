import { unpremultiplyRgba } from '../utils/image-alpha.utils';

it('preserves semantic color and alpha when encoding Pixi readback as PNG', () => {
  const source = new Uint8Array([0, 0, 51, 51, 64, 32, 0, 128, 255, 0, 0, 255, 10, 20, 30, 0]);
  expect([...unpremultiplyRgba(source)]).toEqual([0, 0, 255, 51, 128, 64, 0, 128, 255, 0, 0, 255, 0, 0, 0, 0]);
  expect([...source]).toEqual([0, 0, 51, 51, 64, 32, 0, 128, 255, 0, 0, 255, 10, 20, 30, 0]);
});
