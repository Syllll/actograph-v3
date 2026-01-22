import { ReadingTypeEnum } from '../enums';

/**
 * Format d'import pour les fichiers .jchronic (v3)
 * 
 * Ce format correspond exactement au format d'export IChronicExport.
 * Les fichiers .jchronic sont des fichiers JSON contenant :
 * - Les métadonnées de l'observation (sans ID)
 * - Le protocole complet avec sa structure hiérarchique (sans IDs)
 * - Tous les readings associés (sans IDs)
 */
export interface IJchronicImport {
  version?: string;
  exportedAt?: string;
  observation: {
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  protocol?: {
    name: string;
    description?: string;
    items?: IJchronicProtocolItem[];
  };
  readings?: IJchronicReading[];
}

export interface IJchronicProtocolItem {
  type: string;
  name: string;
  description?: string;
  action?: string;
  order?: number;
  meta?: Record<string, unknown>;
  children?: IJchronicProtocolItem[];
}

export interface IJchronicReading {
  name: string;
  description?: string;
  type: string;
  dateTime: string;
}

/**
 * Normalized data format for creating observations
 * 
 * This is the common output format used by all parsers.
 * The backend uses this format to create observations.
 */
export interface INormalizedImport {
  observation: {
    name: string;
    description?: string;
  };
  protocol?: INormalizedProtocol;
  readings: INormalizedReading[];
}

export interface INormalizedProtocol {
  name: string;
  description?: string;
  categories?: INormalizedCategory[];
}

export interface INormalizedCategory {
  name: string;
  description?: string;
  order?: number;
  meta?: Record<string, unknown>;
  observables?: INormalizedObservable[];
}

export interface INormalizedObservable {
  name: string;
  description?: string;
  action?: string;
  meta?: Record<string, unknown>;
  order?: number;
}

export interface INormalizedReading {
  name: string;
  description?: string;
  type: ReadingTypeEnum;
  dateTime: Date;
}

