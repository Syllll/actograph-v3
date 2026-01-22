import { ReadingTypeEnum, ProtocolItemTypeEnum } from '../enums';
import { ParseError, ValidationError } from './errors';
import {
  IJchronicImport,
  INormalizedImport,
  INormalizedCategory,
  INormalizedObservable,
} from './types';

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
  let protocolCategories: INormalizedCategory[] = [];

  if (data.protocol?.items) {
    // Sort items by order if present
    const sortedItems = [...data.protocol.items].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : Infinity;
      const orderB = b.order !== undefined ? b.order : Infinity;
      return orderA - orderB;
    });

    for (const item of sortedItems) {
      // Only process categories (observables are in children)
      if (item.type === ProtocolItemTypeEnum.Category) {
        const observables: INormalizedObservable[] = [];

        if (item.children && Array.isArray(item.children)) {
          // Sort observables by order if present
          const sortedChildren = [...item.children].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;
            return orderA - orderB;
          });

          for (const child of sortedChildren) {
            if (child.type === ProtocolItemTypeEnum.Observable) {
              observables.push({
                name: child.name,
                description: child.description,
                action: child.action,
                meta: child.meta,
                order: child.order,
              });
            }
          }
        }

        protocolCategories.push({
          name: item.name,
          description: item.description,
          order: item.order,
          meta: item.meta,
          observables: observables.length > 0 ? observables : undefined,
        });
      }
    }
  }

  return {
    observation: {
      name: data.observation.name,
      description: data.observation.description,
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
      type: reading.type as ReadingTypeEnum,
      dateTime: new Date(reading.dateTime),
    })),
  };
}

