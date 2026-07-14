import { ObservationModeEnum, ReadingTypeEnum } from '../enums';
import type { IGraphPreferences } from '../types/protocol.types';

/**
 * Format d'import pour les fichiers .jchronic (v3)
 * 
 * Ce format correspond exactement au format d'export IChronicExport.
 * Les fichiers .jchronic sont des fichiers JSON contenant :
 * - Les métadonnées de l'observation (sans ID)
 * - Le protocole complet avec sa structure hiérarchique (sans IDs)
 * - Tous les readings associés (sans IDs)
 */
/**
 * Métadonnées d'observation persistées dans observation.meta (et exportées
 * dans le .jchronic). Toutes les clés sont optionnelles pour garantir la
 * compatibilité ascendante : une chronic sans meta reste valide.
 *
 * `uiScale` : facteur d'échelle global de l'UI d'observation (taille des
 * boutons), borné côté parser/UI. Permet de retrouver la même disposition
 * visuelle après export/import ou réouverture.
 */
export interface IObservationMeta {
  uiScale?: number;
  [key: string]: unknown;
}

export interface IJchronicImport {
  version?: string;
  exportedAt?: string;
  observation: {
    name: string;
    description?: string;
    videoPath?: string | null;
    mode?: ObservationModeEnum | null;
    meta?: Record<string, unknown> | null;
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
  /** @deprecated Alias mobile historique de `order` */
  sortOrder?: number;
  meta?: Record<string, unknown>;
  graphPreferences?: IGraphPreferences;
  /** @deprecated Champ plat mobile, préférer graphPreferences.color */
  color?: string;
  /** @deprecated Champ plat mobile, préférer graphPreferences.displayMode */
  displayMode?: string;
  /** @deprecated Champ plat mobile, préférer graphPreferences.backgroundPattern */
  backgroundPattern?: string;
  /** @deprecated Champ plat mobile, préférer graphPreferences.strokeWidth */
  strokeWidth?: number;
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
    videoPath?: string;
    mode?: ObservationModeEnum;
    /**
     * Métadonnées d'observation normalisées (uiScale, ...).
     * Undefined si la chronic source n'en contient pas (compat ascendante).
     */
    meta?: IObservationMeta;
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
  action?: string;
  order?: number;
  meta?: Record<string, unknown>;
  graphPreferences?: IGraphPreferences;
  observables?: INormalizedObservable[];
}

export interface INormalizedObservable {
  name: string;
  description?: string;
  action?: string;
  meta?: Record<string, unknown>;
  order?: number;
  graphPreferences?: IGraphPreferences;
}

export interface INormalizedReading {
  name: string;
  description?: string;
  type: ReadingTypeEnum;
  dateTime: Date;
}

