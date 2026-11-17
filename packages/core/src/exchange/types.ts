import { ObservationModeEnum, ReadingTypeEnum } from '../enums';
import { IProtocolItem } from '../types/protocol.types';

export type ExchangeKind = 'readings' | 'protocol';
export interface ExchangeDiagnostic {
  code: string;
  message: string;
  row?: number;
}
export interface ExchangeValidationResult {
  valid: boolean;
  errors: ExchangeDiagnostic[];
  warnings: ExchangeDiagnostic[];
}
export interface ExchangeReading {
  order: number;
  type: ReadingTypeEnum;
  name: string | null;
  description: string | null;
  /** ISO with timezone in calendar mode, integer elapsed milliseconds otherwise. */
  time: string | number;
}
export interface ReadingExchangeDocument {
  format: 'actograph-tabular';
  version: 1;
  kind: 'readings';
  mode: ObservationModeEnum;
  readings: ExchangeReading[];
}
export interface ProtocolExchangeDocument {
  format: 'actograph-tabular';
  version: 1;
  kind: 'protocol';
  items: IProtocolItem[];
}
export type TabularExchangeDocument = ReadingExchangeDocument | ProtocolExchangeDocument;
export interface ProtocolCorrespondenceDiagnostic {
  unknownReadingCount: number;
  unknownNames: string[];
  ambiguousReadingCount: number;
  ambiguousNames: string[];
  duplicateObservableNames: string[];
}
export class ExchangeParseError extends Error {
  constructor(public readonly diagnostics: ExchangeDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
    this.name = 'ExchangeParseError';
  }
}
