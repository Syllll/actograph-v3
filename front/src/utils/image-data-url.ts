/**
 * Extracts the base64 payload from a Pixi/canvas image string.
 * `renderer.extract.base64` returns a data URL; some fallbacks return raw base64.
 */
export function payloadFromImageDataUrl(dataUrl: string): string | null {
  if (!dataUrl) {
    return null;
  }
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex >= 0) {
    const payload = dataUrl.slice(commaIndex + 1).trim();
    return payload.length > 0 ? payload : null;
  }
  const compact = dataUrl.replace(/\s/g, '');
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    return compact;
  }
  return null;
}
