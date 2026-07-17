import {
  ReadingTypeEnum,
  ProtocolItemTypeEnum,
  ObservationModeEnum,
  TimeDisplayFormatEnum,
} from '../enums';
import {
  ParseError,
  ValidationError,
} from './errors';
import {
  IJchronicImport,
  INormalizedImport,
  INormalizedCategory,
  INormalizedObservable,
  IObservationMeta,
  IJchronicProtocolItem,
} from './types';
import type { IGraphPreferences } from '../types/protocol.types';

/**
 * Parse a .jchronic file content (JSON format)
 * 
 * @param content - JSON string content of the file
 * @returns Parsed jchronic data
 * @throws ParseError if JSON is invalid
 * @throws ValidationError if required fields are missing
 */
export function parseJchronicFile(content: string): IJchronicImport {
  let data: IJchronicImport;
  
  try {
    data = JSON.parse(content) as IJchronicImport;
  } catch {
    throw new ParseError(
      'Format .jchronic invalide : format JSON invalide',
      'jchronic',
    );
  }

  // Validate required fields
  if (!data.observation || !data.observation.name) {
    throw new ValidationError(
      'Format .jchronic invalide : champ observation.name manquant',
    );
  }

  return data;
}

function getJchronicItemOrder(item: { order?: number; sortOrder?: number }): number | undefined {
  return item.order ?? item.sortOrder;
}

function resolveJchronicItemGraphPreferences(
  item: IJchronicProtocolItem,
): IGraphPreferences | undefined {
  const legacy: IGraphPreferences = {};

  if (item.color && item.color.trim() !== '') {
    legacy.color = item.color;
  }
  if (item.displayMode) {
    legacy.displayMode = item.displayMode as IGraphPreferences['displayMode'];
  }
  if (item.backgroundPattern) {
    legacy.backgroundPattern = item.backgroundPattern as IGraphPreferences['backgroundPattern'];
  }
  if (typeof item.strokeWidth === 'number' && Number.isFinite(item.strokeWidth)) {
    legacy.strokeWidth = item.strokeWidth;
  }

  const merged = {
    ...legacy,
    ...(item.graphPreferences ?? {}),
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function normalizeObservationMode(
  mode: ObservationModeEnum | null | undefined,
): ObservationModeEnum | undefined {
  if (mode === ObservationModeEnum.Calendar) {
    return ObservationModeEnum.Calendar;
  }

  if (mode === ObservationModeEnum.Chronometer) {
    return ObservationModeEnum.Chronometer;
  }

  return undefined;
}

function normalizeReadingType(type: string | null | undefined): ReadingTypeEnum {
  const normalizedType = (type || ReadingTypeEnum.DATA).toLowerCase();
  const aliases: Record<string, ReadingTypeEnum> = {
    [ReadingTypeEnum.START]: ReadingTypeEnum.START,
    [ReadingTypeEnum.STOP]: ReadingTypeEnum.STOP,
    [ReadingTypeEnum.PAUSE_START]: ReadingTypeEnum.PAUSE_START,
    pausestart: ReadingTypeEnum.PAUSE_START,
    [ReadingTypeEnum.PAUSE_END]: ReadingTypeEnum.PAUSE_END,
    pauseend: ReadingTypeEnum.PAUSE_END,
    [ReadingTypeEnum.DATA]: ReadingTypeEnum.DATA,
  };

  return aliases[normalizedType] ?? ReadingTypeEnum.DATA;
}

/**
 * Bornes de validation du `uiScale` à l'import. Plage large pour accepter
 * les valeurs produites par le desktop (0.7-1.6) et le mobile (0.6-1.8),
 * tout en rejetant les valeurs aberrantes. Hors plage => champ ignoré.
 */
const UI_SCALE_IMPORT_MIN = 0.3;
const UI_SCALE_IMPORT_MAX = 3;

/**
 * Normalise le meta d'observation issu du parsing.
 *
 * Règles (compatibilité ascendante) :
 * - meta absent / null / non-objet => retourne undefined (aucune casse pour
 *   les chronics anciennes qui n'ont pas de meta).
 * - `uiScale` : conservé uniquement si nombre fini dans les bornes ; sinon
 *   retiré silencieusement.
 * - Les autres clés inconnues sont conservées telles quelles (forward-compat).
 */
function normalizeObservationMeta(
  meta: unknown,
): IObservationMeta | undefined {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return undefined;
  }

  const source = meta as Record<string, unknown>;
  const result: IObservationMeta = {};

  const uiScale = source.uiScale;
  if (
    typeof uiScale === 'number' &&
    Number.isFinite(uiScale) &&
    uiScale >= UI_SCALE_IMPORT_MIN &&
    uiScale <= UI_SCALE_IMPORT_MAX
  ) {
    result.uiScale = Math.round(uiScale * 100) / 100;
  }

  const timeDisplayFormat = source.timeDisplayFormat;
  if (
    typeof timeDisplayFormat === 'string' &&
    (Object.values(TimeDisplayFormatEnum) as string[]).includes(timeDisplayFormat)
  ) {
    result.timeDisplayFormat = timeDisplayFormat as TimeDisplayFormatEnum;
  }

  for (const key of Object.keys(source)) {
    if (key === 'uiScale' || key === 'timeDisplayFormat') continue;
    result[key] = source[key];
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalize jchronic data to common import format
 * 
 * This function converts the jchronic format to a normalized format
 * that can be used to create observations.
 * 
 * @param data - Parsed jchronic data
 * @returns Normalized import data
 */
export function normalizeJchronicData(data: IJchronicImport): INormalizedImport {
  // Process protocol if present
  const protocolCategories: INormalizedCategory[] = [];

  if (data.protocol?.items) {
    // Sort items by order if present
    const sortedItems = [...data.protocol.items].sort((a, b) => {
      const orderA = getJchronicItemOrder(a) ?? Infinity;
      const orderB = getJchronicItemOrder(b) ?? Infinity;
      return orderA - orderB;
    });

    for (const item of sortedItems) {
      // Only process categories (observables are in children)
      if (item.type === ProtocolItemTypeEnum.Category) {
        const observables: INormalizedObservable[] = [];

        if (item.children && Array.isArray(item.children)) {
          // Sort observables by order if present
          const sortedChildren = [...item.children].sort((a, b) => {
            const orderA = getJchronicItemOrder(a) ?? Infinity;
            const orderB = getJchronicItemOrder(b) ?? Infinity;
            return orderA - orderB;
          });

          for (const child of sortedChildren) {
            if (child.type === ProtocolItemTypeEnum.Observable) {
              const graphPreferences = resolveJchronicItemGraphPreferences(child);
              observables.push({
                name: child.name,
                description: child.description,
                action: child.action,
                meta: child.meta,
                order: getJchronicItemOrder(child),
                ...(graphPreferences ? { graphPreferences } : {}),
              });
            }
          }
        }

        const categoryGraphPreferences = resolveJchronicItemGraphPreferences(item);
        protocolCategories.push({
          name: item.name,
          description: item.description,
          action: item.action,
          order: getJchronicItemOrder(item),
          meta: item.meta,
          ...(categoryGraphPreferences ? { graphPreferences: categoryGraphPreferences } : {}),
          observables: observables.length > 0 ? observables : undefined,
        });
      }
    }
  }

  return {
    observation: {
      name: data.observation.name,
      description: data.observation.description,
      videoPath:
        data.observation.videoPath && data.observation.videoPath.trim() !== ''
          ? data.observation.videoPath
          : undefined,
      mode: normalizeObservationMode(data.observation.mode),
      meta: normalizeObservationMeta(data.observation.meta),
    },
    protocol: data.protocol
      ? {
          name: data.protocol.name,
          description: data.protocol.description,
          categories: protocolCategories.length > 0 ? protocolCategories : undefined,
        }
      : undefined,
    readings: (data.readings || []).map((reading) => ({
      name: reading.name,
      description: reading.description,
      type: normalizeReadingType(reading.type),
      dateTime: new Date(reading.dateTime),
    })),
  };
}

