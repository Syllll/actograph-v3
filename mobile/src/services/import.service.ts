import {
  parseJchronicFile,
  normalizeJchronicData,
  ReadingTypeEnum,
  type INormalizedImport,
} from '@actograph/core';
// NOTE: ChronicV1Parser (binary .chronic files) is NOT available on mobile
// because it requires Node.js streams. Only .jchronic (JSON) format is supported.
import { observationRepository } from '@database/repositories/observation.repository';
import { protocolRepository } from '@database/repositories/protocol.repository';
import { readingRepository, type ReadingType } from '@database/repositories/reading.repository';

/**
 * Map ReadingTypeEnum from @actograph/core to ReadingType for mobile repository
 */
function mapReadingType(type: ReadingTypeEnum): ReadingType {
  const mapping: Record<ReadingTypeEnum, ReadingType> = {
    [ReadingTypeEnum.START]: 'START',
    [ReadingTypeEnum.STOP]: 'STOP',
    [ReadingTypeEnum.PAUSE_START]: 'PAUSE_START',
    [ReadingTypeEnum.PAUSE_END]: 'PAUSE_END',
    [ReadingTypeEnum.DATA]: 'DATA',
  };
  return mapping[type];
}

export interface IImportResult {
  success: boolean;
  observationId?: number;
  observationName?: string;
  categoriesCount?: number;
  observablesCount?: number;
  readingsCount?: number;
  error?: string;
}

/**
 * Service for importing observation files
 */
class ImportService {
  /**
   * Import a .jchronic file (JSON format)
   */
  async importJchronic(content: string, fileName: string): Promise<IImportResult> {
    try {
      // Parse the JSON content
      const parsed = parseJchronicFile(content);
      const normalized = normalizeJchronicData(parsed);

      return this.saveNormalizedImport(normalized, fileName);
    } catch (error) {
      console.error('Error importing jchronic file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // NOTE: importChronic (binary .chronic files) is NOT available on mobile
  // because it requires Node.js streams. Only .jchronic (JSON) format is supported.

  /**
   * Save normalized import data to SQLite
   */
  private async saveNormalizedImport(
    data: INormalizedImport,
    fileName: string
  ): Promise<IImportResult> {
    try {
      // Create observation
      const observationName = data.observation?.name || fileName.replace(/\.(j)?chronic$/, '');
      const observation = await observationRepository.createWithProtocol({
        name: observationName,
        description: data.observation?.description,
        type: 'Normal',
        mode: 'Chronometer',
      });

      // Get the protocol
      const protocol = await protocolRepository.findByObservationId(observation.id);
      if (!protocol) {
        throw new Error('Failed to create protocol');
      }

      let categoriesCount = 0;
      let observablesCount = 0;

      // Add categories and observables
      if (data.protocol?.categories) {
        for (let i = 0; i < data.protocol.categories.length; i++) {
          const category = data.protocol.categories[i];
          const categoryItem = await protocolRepository.addCategory(
            protocol.id,
            category.name,
            i
          );
          categoriesCount++;

          // Add observables to category
          if (category.observables) {
            for (let j = 0; j < category.observables.length; j++) {
              const observable = category.observables[j];
              await protocolRepository.addObservable(
                protocol.id,
                categoryItem.id,
                observable.name,
                undefined, // color is not available in normalized data
                j
              );
              observablesCount++;
            }
          }
        }
      }

      // Add readings
      let readingsCount = 0;
      if (data.readings) {
        for (const reading of data.readings) {
          await readingRepository.addReading(
            observation.id,
            mapReadingType(reading.type),
            reading.dateTime,
            reading.name,
            reading.description
          );
          readingsCount++;
        }
      }

      return {
        success: true,
        observationId: observation.id,
        observationName: observation.name,
        categoriesCount,
        observablesCount,
        readingsCount,
      };
    } catch (error) {
      console.error('Error saving import:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import a file (auto-detect format)
   * NOTE: Only .jchronic (JSON) format is supported on mobile.
   * Binary .chronic files require Node.js and are only supported on the web/backend.
   */
  async importFile(file: File): Promise<IImportResult> {
    const fileName = file.name;

    if (fileName.endsWith('.jchronic')) {
      const content = await this.readFileAsText(file);
      return this.importJchronic(content, fileName);
    } else if (fileName.endsWith('.chronic')) {
      return {
        success: false,
        error: 'Le format .chronic (binaire) n\'est pas supporté sur mobile. Veuillez utiliser le format .jchronic.',
      };
    } else {
      return {
        success: false,
        error: 'Format de fichier non supporté. Utilisez des fichiers .jchronic.',
      };
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

// Singleton instance
export const importService = new ImportService();

