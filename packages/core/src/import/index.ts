/**
 * Import module - Parsers and converters for observation files
 * 
 * Supports:
 * - .jchronic files (JSON format, v3) - Browser & Node.js compatible
 * - .chronic files (binary Qt DataStream format, v1) - Node.js only (import from '@actograph/core/import/chronic-v1')
 */

// Errors
export {
  ImportError,
  ParseError,
  ConversionError,
  ValidationError,
} from './errors';

// Types
export type {
  IJchronicImport,
  IJchronicProtocolItem,
  IJchronicReading,
  INormalizedImport,
  INormalizedProtocol,
  INormalizedCategory,
  INormalizedObservable,
  INormalizedReading,
} from './types';

// JChronic parser (JSON format) - Browser & Node.js compatible
export {
  parseJchronicFile,
  normalizeJchronicData,
} from './jchronic-parser';

// NOTE: Chronic v1 parser (binary format) is NOT exported here because it requires Node.js streams.
// For Node.js environments, import directly from: '@actograph/core/import/chronic-v1'
// 
// Example (Node.js only):
//   import { ChronicV1Parser, normalizeChronicV1Data } from '@actograph/core/import/chronic-v1';

// Re-export types only (no runtime code, safe for browser)
export type {
  IChronicV1,
  IProtocolNodeV1,
  IReadingV1,
  IReadingEntryV1,
} from './chronic-v1/types/chronic-v1.types';

