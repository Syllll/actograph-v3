import {
  parseJchronicFile,
  normalizeJchronicData,
  ObservationModeEnum,
  ReadingTypeEnum,
  type INormalizedImport,
} from '@actograph/core';
import {
  ChronicV1Parser,
  normalizeChronicV1Data,
} from '@actograph/core/import/chronic-v1';
import { Buffer } from 'buffer';
import { observationRepository } from '@database/repositories/observation.repository';
import { protocolRepository } from '@database/repositories/protocol.repository';
import { readingRepository, type ReadingType } from '@database/repositories/reading.repository';

/**
 * Map ReadingTypeEnum from @actograph/core to ReadingType for mobile repository
 */
function mapReadingType(type: ReadingTypeEnum | string): ReadingType {
  const normalizedType = type.toLowerCase();
  const mapping: Record<string, ReadingType> = {
    [ReadingTypeEnum.START]: 'START',
    [ReadingTypeEnum.STOP]: 'STOP',
    [ReadingTypeEnum.PAUSE_START]: 'PAUSE_START',
    [ReadingTypeEnum.PAUSE_END]: 'PAUSE_END',
    [ReadingTypeEnum.DATA]: 'DATA',
    START: 'START',
    STOP: 'STOP',
    PAUSE_START: 'PAUSE_START',
    PAUSE_END: 'PAUSE_END',
    DATA: 'DATA',
  };
  const readingType = mapping[type] ?? mapping[normalizedType];

  if (!readingType) {
    throw new Error(`Type de relevé non supporté: ${type}`);
  }

  return readingType;
}

function mapObservationMode(type: ObservationModeEnum | string | undefined): string {
  if (!type) {
    return 'Calendar';
  }

  return type.toLowerCase() === ObservationModeEnum.Chronometer
    ? 'Chronometer'
    : 'Calendar';
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
  private chronicV1Parser = new ChronicV1Parser();

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

  /**
   * Import a legacy .chronic file and convert it to the normalized format on the fly.
   */
  async importChronic(
    content: ArrayBuffer | Uint8Array | string,
    fileName: string
  ): Promise<IImportResult> {
    try {
      const buffer = this.toBuffer(content);
      const parsed = this.chronicV1Parser.parse(buffer);
      const normalized = normalizeChronicV1Data(parsed);

      return this.saveNormalizedImport(normalized, fileName);
    } catch (error) {
      console.error('Error importing chronic file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

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
        mode: mapObservationMode(data.observation?.mode),
        meta: data.observation?.meta ?? null,
      });

      try {
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
              i,
              'continuous',
              category.meta
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
        // Rollback: delete the observation (cascades to protocol, protocol_items, readings)
        try {
          await observationRepository.hardDelete(observation.id);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        throw error;
      }
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
   */
  async importFile(file: File): Promise<IImportResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.jchronic')) {
      const content = await this.readFileAsText(file);
      return this.importJchronic(content, file.name);
    } else if (fileName.endsWith('.chronic')) {
      const content = await this.readFileAsArrayBuffer(file);
      return this.importChronic(content, file.name);
    } else {
      return {
        success: false,
        error: 'Format de fichier non supporté. Utilisez des fichiers .jchronic ou .chronic.',
      };
    }
  }

  private toBuffer(content: ArrayBuffer | Uint8Array | string): Buffer {
    (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;

    if (content instanceof ArrayBuffer) {
      return Buffer.from(content);
    }

    if (content instanceof Uint8Array) {
      return Buffer.from(content);
    }

    // CapacitorHttp renvoie les réponses binaires (responseType 'arraybuffer')
    // sous forme de chaîne base64. Sur Android, Base64.DEFAULT insère des CRLF
    // tous les 76 caractères : on strippe tout whitespace avant la détection
    // et le décodage, sinon la regex échoue et on retombe sur 'binary'
    // (corruption silencieuse du binaire).
    const base64Candidate = content.replace(/\s+/g, '');
    if (
      base64Candidate.length > 0 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(base64Candidate) &&
      base64Candidate.length % 4 === 0
    ) {
      return Buffer.from(base64Candidate, 'base64');
    }

    return Buffer.from(content, 'binary');
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

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }
}

// Singleton instance
export const importService = new ImportService();

