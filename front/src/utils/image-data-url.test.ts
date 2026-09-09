import { payloadFromImageDataUrl } from './image-data-url';

describe('payloadFromImageDataUrl', () => {
  it('strips a PNG data URL prefix', () => {
    expect(payloadFromImageDataUrl('data:image/png;base64,abc+/=')).toBe('abc+/=');
  });

  it('accepts raw base64 without a data URL prefix', () => {
    expect(payloadFromImageDataUrl('abc+/==')).toBe('abc+/==');
  });

  it('returns null for an empty data URL payload', () => {
    expect(payloadFromImageDataUrl('data:image/png;base64,')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(payloadFromImageDataUrl('')).toBeNull();
  });
});
