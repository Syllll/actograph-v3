import { observationRepository } from '@database/repositories/observation.repository';
import { protocolRepository, type IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import { readingRepository } from '@database/repositories/reading.repository';

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
  color?: string;
  action?: string;
  displayMode?: string;
  backgroundPattern?: string;
  sortOrder?: number;
  meta?: Record<string, unknown>;
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
          type: r.type,
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

  /**
   * Convertit les items du protocole au format d'export (sans IDs)
   */
  private convertProtocolItems(items: IProtocolItemWithChildren[]): IJchronicProtocolItem[] {
    return items.map((item) => {
      const exportItem: IJchronicProtocolItem = {
        name: item.name,
        type: item.type,
      };

      if (item.color) exportItem.color = item.color;
      if (item.action) exportItem.action = item.action;
      if (item.display_mode) exportItem.displayMode = item.display_mode;
      if (item.background_pattern) exportItem.backgroundPattern = item.background_pattern;
      if (item.sort_order !== undefined) exportItem.sortOrder = item.sort_order;
      if (item.meta) exportItem.meta = item.meta;

      if (item.children && item.children.length > 0) {
        exportItem.children = this.convertProtocolItems(item.children);
      }

      return exportItem;
    });
  }
}

// Singleton
export const exportService = new ExportService();
