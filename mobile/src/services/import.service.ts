import {
  parseJchronicFile,
  normalizeJchronicData,
  ObservationModeEnum,
  ReadingTypeEnum,
  type INormalizedImport,
  type INormalizedCategory,
  type INormalizedObservable,
  type IGraphPreferences,
} from '@actograph/core';
import {
  ChronicV1Parser,
  normalizeChronicV1Data,
} from '@actograph/core/import/chronic-v1';
import { Buffer } from 'buffer';
import { observationRepository } from '@database/repositories/observation.repository';
import { protocolRepository } from '@database/repositories/protocol.repository';
import { readingRepository, type ReadingType } from '@database/repositories/reading.repository';
import {
  buildProtocolItemMetaWithGraphExtras,
  buildProtocolItemUpdatesFromGraphPreferences,
  normalizeImportedCategoryAction,
  resolveImportedSupportCategoryForMobile,
} from '@utils/protocol-graph-preferences-mobile';

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

function stripPortableSupportFields(
  graphPreferences?: IGraphPreferences,
): IGraphPreferences | undefined {
  if (!graphPreferences) {
    return undefined;
  }

  const stripped: IGraphPreferences = { ...graphPreferences };
  delete stripped.supportCategoryId;
  delete stripped.supportCategoryName;

  return Object.keys(stripped).length > 0 ? stripped : undefined;
}

async function persistCategoryFromImport(
  protocolId: number,
  category: INormalizedCategory,
  sortOrder: number,
): Promise<{
  id: number;
  sourceGraphPreferences?: IGraphPreferences;
  persistedMeta?: Record<string, unknown> | null;
}> {
  const sourceGraphPreferences = category.graphPreferences
    ? { ...category.graphPreferences }
    : undefined;

  const categoryItem = await protocolRepository.addCategory(
    protocolId,
    category.name,
    sortOrder,
    normalizeImportedCategoryAction(category.action),
    category.meta ?? null,
  );

  const preferenceUpdates = buildProtocolItemUpdatesFromGraphPreferences(
    stripPortableSupportFields(sourceGraphPreferences),
  );
  const meta = buildProtocolItemMetaWithGraphExtras(category.meta, sourceGraphPreferences);
  if (meta) {
    preferenceUpdates.meta = meta;
  }

  if (Object.keys(preferenceUpdates).length > 0) {
    await protocolRepository.updateItem(categoryItem.id, preferenceUpdates);
  }

  return {
    id: categoryItem.id,
    sourceGraphPreferences,
    persistedMeta: meta ?? category.meta ?? null,
  };
}

async function persistObservableFromImport(
  protocolId: number,
  categoryId: number,
  observable: INormalizedObservable,
  sortOrder: number,
): Promise<void> {
  const newObservable = await protocolRepository.addObservable(
    protocolId,
    categoryId,
    observable.name,
    observable.graphPreferences?.color,
    sortOrder,
    observable.action ? normalizeImportedCategoryAction(observable.action) : undefined,
  );

  const preferenceUpdates = buildProtocolItemUpdatesFromGraphPreferences(
    observable.graphPreferences,
  );
  const observableMeta = buildProtocolItemMetaWithGraphExtras(
    observable.meta,
    observable.graphPreferences,
  );
  if (observableMeta) {
    preferenceUpdates.meta = observableMeta;
  }

  if (Object.keys(preferenceUpdates).length > 0) {
    await protocolRepository.updateItem(newObservable.id, preferenceUpdates);
  }
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

class ImportService {
  private chronicV1Parser = new ChronicV1Parser();

  async importJchronic(content: string, fileName: string): Promise<IImportResult> {
    try {
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

  private async saveNormalizedImport(
    data: INormalizedImport,
    fileName: string
  ): Promise<IImportResult> {
    try {
      const observationName = data.observation?.name || fileName.replace(/\.(j)?chronic$/, '');
      const observation = await observationRepository.createWithProtocol({
        name: observationName,
        description: data.observation?.description,
        type: 'Normal',
        mode: mapObservationMode(data.observation?.mode),
        meta: data.observation?.meta ?? null,
      });

      try {
        const protocol = await protocolRepository.findByObservationId(observation.id);
        if (!protocol) {
          throw new Error('Failed to create protocol');
        }

        let categoriesCount = 0;
        let observablesCount = 0;
        const createdCategories: Array<{
          id: number;
          sourceGraphPreferences?: IGraphPreferences;
          persistedMeta?: Record<string, unknown> | null;
        }> = [];

        if (data.protocol?.categories) {
          for (let i = 0; i < data.protocol.categories.length; i++) {
            const category = data.protocol.categories[i];
            const categoryItem = await persistCategoryFromImport(
              protocol.id,
              category,
              category.order ?? i,
            );
            createdCategories.push(categoryItem);
            categoriesCount++;

            if (category.observables) {
              for (let j = 0; j < category.observables.length; j++) {
                const observable = category.observables[j];
                await persistObservableFromImport(
                  protocol.id,
                  categoryItem.id,
                  observable,
                  observable.order ?? j,
                );
                observablesCount++;
              }
            }
          }

          const categoryNameToId = new Map(
            data.protocol.categories.flatMap((category, index) => {
              const id = createdCategories[index]?.id;
              return id !== undefined ? [[category.name, id] as const] : [];
            }),
          );

          for (const created of createdCategories) {
            const resolved = resolveImportedSupportCategoryForMobile(
              created.sourceGraphPreferences,
              categoryNameToId,
            );

            if (resolved?.supportCategoryId) {
              const meta = buildProtocolItemMetaWithGraphExtras(
                created.persistedMeta,
                resolved,
              );
              if (meta) {
                await protocolRepository.updateItem(created.id, { meta });
              }
            }
          }
        }

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

  async importFile(file: File): Promise<IImportResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.jchronic')) {
      const content = await this.readFileAsText(file);
      return this.importJchronic(content, file.name);
    } else if (fileName.endsWith('.chronic')) {
      const content = await this.readFileAsArrayBuffer(file);
      return this.importChronic(content, file.name);
    }

    return {
      success: false,
      error: 'Format de fichier non supporté. Utilisez des fichiers .jchronic ou .chronic.',
    };
  }

  private toBuffer(content: ArrayBuffer | Uint8Array | string): Buffer {
    (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;

    if (content instanceof ArrayBuffer) {
      return Buffer.from(content);
    }

    if (content instanceof Uint8Array) {
      return Buffer.from(content);
    }

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

export const importService = new ImportService();
