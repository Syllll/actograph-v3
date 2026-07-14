import { observationRepository } from '@database/repositories/observation.repository';
import { protocolRepository, type IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import { readingRepository, type ReadingType } from '@database/repositories/reading.repository';
import { ObservationModeEnum, ReadingTypeEnum, type IGraphPreferences } from '@actograph/core';
import {
  buildGraphPreferencesForMobileExport,
  sanitizeMetaForExport,
} from '@utils/protocol-graph-preferences-mobile';

/**
 * Format d'export .jchronic
 * Compatible avec l'API actograph.io et l'import de l'app web/desktop
 */
export interface IJchronicExport {
  version: string;
  exportedAt: string;
  observation: {
    name: string;
    description?: string;
    mode?: ObservationModeEnum;
    meta?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  protocol?: {
    name: string;
    description?: string;
    items?: IJchronicProtocolItem[];
  };
  readings?: IJchronicReading[];
}

export interface IJchronicProtocolItem {
  name: string;
  type: 'category' | 'observable';
  action?: string;
  order?: number;
  meta?: Record<string, unknown>;
  graphPreferences?: IGraphPreferences;
  /** @deprecated Conservé pour compatibilité ascendante */
  color?: string;
  displayMode?: string;
  backgroundPattern?: string;
  children?: IJchronicProtocolItem[];
}

export interface IJchronicReading {
  name?: string;
  description?: string;
  type: string;
  dateTime: string;
}

export interface IExportResult {
  success: boolean;
  content?: string;
  fileName?: string;
  error?: string;
}

/**
 * Service d'export de chroniques locales vers le format .jchronic
 */
class ExportService {
  private mapReadingType(type: ReadingType): ReadingTypeEnum {
    const mapping: Record<ReadingType, ReadingTypeEnum> = {
      START: ReadingTypeEnum.START,
      STOP: ReadingTypeEnum.STOP,
      PAUSE_START: ReadingTypeEnum.PAUSE_START,
      PAUSE_END: ReadingTypeEnum.PAUSE_END,
      DATA: ReadingTypeEnum.DATA,
    };

    return mapping[type];
  }

  private mapObservationMode(mode?: string): ObservationModeEnum {
    return mode?.toLowerCase() === ObservationModeEnum.Chronometer
      ? ObservationModeEnum.Chronometer
      : ObservationModeEnum.Calendar;
  }

  /**
   * Exporte une observation locale au format .jchronic
   */
  async exportToJchronic(observationId: number): Promise<IExportResult> {
    try {
      // Récupérer l'observation
      const observation = await observationRepository.findById(observationId);
      if (!observation) {
        return {
          success: false,
          error: 'Observation introuvable',
        };
      }

      // Récupérer le protocole
      const protocol = await protocolRepository.findByObservationId(observationId);
      let protocolItems: IProtocolItemWithChildren[] = [];
      if (protocol) {
        protocolItems = await protocolRepository.getProtocolItems(protocol.id);
      }

      // Récupérer les readings
      const readings = await readingRepository.findByObservationId(observationId);

      // Construire l'objet d'export
      const exportData: IJchronicExport = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        observation: {
          name: observation.name,
          description: observation.description,
          mode: this.mapObservationMode(observation.mode),
          // meta n'est inclus que si présent (compat ascendante).
          meta: observation.meta ?? undefined,
          createdAt: observation.created_at || new Date().toISOString(),
          updatedAt: observation.updated_at || new Date().toISOString(),
        },
        protocol: {
          name: observation.name,
          description: observation.description,
          items: this.convertProtocolItems(protocolItems),
        },
        readings: readings.map((r) => ({
          name: r.name,
          description: r.description,
          type: this.mapReadingType(r.type),
          dateTime: r.date,
        })),
      };

      // Générer le contenu JSON
      const content = JSON.stringify(exportData, null, 2);
      
      // Générer le nom de fichier
      const safeName = observation.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${safeName}.jchronic`;

      return {
        success: true,
        content,
        fileName,
      };
    } catch (error) {
      console.error('Error exporting observation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private collectCategoryIdToName(
    items: IProtocolItemWithChildren[],
    map = new Map<string, string>(),
  ): Map<string, string> {
    for (const item of items) {
      if (item.type === 'category') {
        map.set(String(item.id), item.name);
      }
      if (item.children?.length) {
        this.collectCategoryIdToName(item.children, map);
      }
    }
    return map;
  }

  /**
   * Convertit les items du protocole au format d'export (sans IDs)
   */
  private convertProtocolItems(items: IProtocolItemWithChildren[]): IJchronicProtocolItem[] {
    const categoryIdToName = this.collectCategoryIdToName(items);

    return items.map((item) => {
      const exportItem: IJchronicProtocolItem = {
        name: item.name,
        type: item.type,
      };

      const graphPreferences = buildGraphPreferencesForMobileExport(item, categoryIdToName);
      if (graphPreferences) {
        exportItem.graphPreferences = graphPreferences;
        if (graphPreferences.color) {
          exportItem.color = graphPreferences.color;
        }
        if (graphPreferences.displayMode) {
          exportItem.displayMode = graphPreferences.displayMode;
        }
        if (graphPreferences.backgroundPattern) {
          exportItem.backgroundPattern = graphPreferences.backgroundPattern;
        }
      }

      if (item.action) exportItem.action = item.action;
      if (item.sort_order !== undefined) exportItem.order = item.sort_order;

      const exportedMeta = sanitizeMetaForExport(item.meta);
      if (exportedMeta) exportItem.meta = exportedMeta;

      if (item.children && item.children.length > 0) {
        exportItem.children = this.convertProtocolItems(item.children);
      }

      return exportItem;
    });
  }
}

// Singleton
export const exportService = new ExportService();
