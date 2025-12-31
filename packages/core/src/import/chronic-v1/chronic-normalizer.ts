import { IChronicV1 } from './types/chronic-v1.types';
import { ProtocolV1Converter } from './converter/protocol-converter';
import { ReadingV1Converter } from './converter/reading-converter';
import { INormalizedImport } from '../types';

/**
 * Normalize chronic v1 data to common import format
 * 
 * @param chronic - Parsed chronic v1 data
 * @returns Normalized import data
 */
export function normalizeChronicV1Data(chronic: IChronicV1): INormalizedImport {
  const protocolConverter = new ProtocolV1Converter();
  const readingConverter = new ReadingV1Converter();

  // Convert protocol
  let protocolNormalized: INormalizedImport['protocol'];
  if (chronic.protocol) {
    const converted = protocolConverter.convert(chronic.protocol);
    protocolNormalized = {
      name: converted.name,
      description: converted.description,
      categories: converted.categories,
    };
  }

  // Convert readings
  const readingsNormalized = readingConverter.convert(
    chronic.reading?.readings || [],
  );

  return {
    observation: {
      name: chronic.name || 'Chronique importée',
      description: undefined,
    },
    protocol: protocolNormalized,
    readings: readingsNormalized,
  };
}

