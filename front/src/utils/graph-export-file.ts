import { payloadFromImageDataUrl } from './image-data-url';

export type GraphExportFormat = 'png' | 'jpeg' | 'svg';

export function graphExportFile(format: GraphExportFormat, content: string): {
  extension: string;
  data: string;
  encoding: 'utf8' | 'base64';
  blob: Blob;
} {
  if (format === 'svg') {
    return { extension: 'svg', data: content, encoding: 'utf8', blob: new Blob([content], { type: 'image/svg+xml;charset=utf-8' }) };
  }
  const data = payloadFromImageDataUrl(content);
  if (!data) throw new Error('Invalid graph image');
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return {
    extension: format === 'jpeg' ? 'jpg' : 'png', data, encoding: 'base64',
    blob: new Blob([bytes], { type: format === 'jpeg' ? 'image/jpeg' : 'image/png' }),
  };
}
