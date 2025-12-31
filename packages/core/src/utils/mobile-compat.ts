/**
 * Mobile compatibility utilities
 * 
 * These functions handle the conversion between mobile data formats
 * (which may use uppercase strings) and core enums (which use lowercase values).
 * 
 * This centralizes all mobile ↔ core conversions in one place.
 */

import {
  ReadingTypeEnum,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
  BackgroundPatternEnum,
  DisplayModeEnum,
  ObservationModeEnum,
  ObservationType,
} from '../enums';
import type { IObservation, IProtocol, IProtocolItem, IReading, IGraphPreferences } from '../types';

/**
 * Maps a mobile reading type string to the core enum.
 * Handles both uppercase (mobile DB) and lowercase (core) formats.
 * 
 * @example
 * mapReadingType('START') // → ReadingTypeEnum.START ('start')
 * mapReadingType('start') // → ReadingTypeEnum.START ('start')
 */
export function mapReadingType(type: string | null | undefined): ReadingTypeEnum {
  if (!type) return ReadingTypeEnum.DATA;
  
  const normalized = type.toLowerCase();
  
  switch (normalized) {
    case 'start':
      return ReadingTypeEnum.START;
    case 'stop':
      return ReadingTypeEnum.STOP;
    case 'pause_start':
      return ReadingTypeEnum.PAUSE_START;
    case 'pause_end':
      return ReadingTypeEnum.PAUSE_END;
    case 'data':
    default:
      return ReadingTypeEnum.DATA;
  }
}

/**
 * Maps a mobile protocol item type string to the core enum.
 */
export function mapProtocolItemType(type: string | null | undefined): ProtocolItemTypeEnum {
  if (!type) return ProtocolItemTypeEnum.Observable;
  
  const normalized = type.toLowerCase();
  
  return normalized === 'category' 
    ? ProtocolItemTypeEnum.Category 
    : ProtocolItemTypeEnum.Observable;
}

/**
 * Maps a mobile action string to the core enum.
 */
export function mapProtocolItemAction(action: string | null | undefined): ProtocolItemActionEnum | undefined {
  if (!action) return undefined;
  
  const normalized = action.toLowerCase();
  
  switch (normalized) {
    case 'continuous':
      return ProtocolItemActionEnum.Continuous;
    case 'discrete':
      return ProtocolItemActionEnum.Discrete;
    default:
      return undefined;
  }
}

/**
 * Maps a mobile display mode string to the core enum.
 */
export function mapDisplayMode(mode: string | null | undefined): DisplayModeEnum | undefined {
  if (!mode) return undefined;
  
  const normalized = mode.toLowerCase();
  
  switch (normalized) {
    case 'normal':
      return DisplayModeEnum.Normal;
    case 'background':
      return DisplayModeEnum.Background;
    case 'frieze':
      return DisplayModeEnum.Frieze;
    default:
      return undefined;
  }
}

/**
 * Maps a mobile background pattern string to the core enum.
 */
export function mapBackgroundPattern(pattern: string | null | undefined): BackgroundPatternEnum | undefined {
  if (!pattern) return undefined;
  
  const normalized = pattern.toLowerCase();
  
  switch (normalized) {
    case 'solid':
      return BackgroundPatternEnum.Solid;
    case 'horizontal':
      return BackgroundPatternEnum.Horizontal;
    case 'vertical':
      return BackgroundPatternEnum.Vertical;
    case 'diagonal':
      return BackgroundPatternEnum.Diagonal;
    case 'grid':
      return BackgroundPatternEnum.Grid;
    case 'dots':
      return BackgroundPatternEnum.Dots;
    default:
      return undefined;
  }
}

/**
 * Maps a mobile observation mode string to the core enum.
 */
export function mapObservationMode(mode: string | null | undefined): ObservationModeEnum | undefined {
  if (!mode) return undefined;
  
  const normalized = mode.toLowerCase();
  
  switch (normalized) {
    case 'calendar':
      return ObservationModeEnum.Calendar;
    case 'chronometer':
      return ObservationModeEnum.Chronometer;
    default:
      return undefined;
  }
}

// ============================================================================
// Mobile data structure interfaces (for type safety in conversion)
// ============================================================================

/**
 * Mobile reading entity (from SQLite)
 */
export interface IMobileReading {
  id: number;
  observation_id?: number;
  type: string;
  name?: string | null;
  description?: string | null;
  date: string; // ISO string
}

/**
 * Mobile protocol item entity (from SQLite)
 */
export interface IMobileProtocolItem {
  id: number;
  protocol_id?: number;
  parent_id?: number | null;
  name: string;
  type: string; // 'category' | 'observable'
  color?: string | null;
  action?: string | null;
  display_mode?: string | null;
  background_pattern?: string | null;
  sort_order?: number;
  children?: IMobileProtocolItem[];
}

/**
 * Mobile observation entity (from SQLite)
 */
export interface IMobileObservation {
  id: number;
  name: string;
  description?: string | null;
  type?: string;
  mode?: string; // 'Calendar' | 'Chronometer'
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Full conversion functions
// ============================================================================

/**
 * Converts mobile readings to core IReading format.
 */
export function convertMobileReadings(readings: IMobileReading[]): IReading[] {
  return readings.map((r) => ({
    id: r.id,
    name: r.name || undefined,
    description: r.description || undefined,
    type: mapReadingType(r.type),
    dateTime: new Date(r.date),
  }));
}

/**
 * Converts mobile protocol items to core IProtocolItem format.
 */
export function convertMobileProtocolItems(items: IMobileProtocolItem[]): IProtocolItem[] {
  return items.map((item) => {
    const graphPreferences: IGraphPreferences | undefined = 
      (item.display_mode || item.background_pattern || item.color)
        ? {
            displayMode: mapDisplayMode(item.display_mode),
            backgroundPattern: mapBackgroundPattern(item.background_pattern),
            color: item.color || undefined,
          }
        : undefined;

    const converted: IProtocolItem = {
      id: String(item.id),
      name: item.name,
      type: mapProtocolItemType(item.type),
      action: mapProtocolItemAction(item.action),
      graphPreferences,
    };

    // Recursively convert children
    if (item.children && item.children.length > 0) {
      converted.children = convertMobileProtocolItems(item.children);
    }

    return converted;
  });
}

/**
 * Converts mobile observation + protocol + readings to a complete core IObservation.
 * This is the main entry point for mobile → core conversion.
 * 
 * @example
 * const observation = convertMobileObservation(
 *   mobileChronicle,
 *   mobileProtocolItems,
 *   mobileReadings
 * );
 * pixiApp.setData(observation);
 */
export function convertMobileObservation(
  observation: IMobileObservation,
  protocolItems: IMobileProtocolItem[],
  readings: IMobileReading[]
): IObservation {
  const protocol: IProtocol = {
    id: observation.id,
    name: observation.name,
    items: convertMobileProtocolItems(protocolItems),
  };

  return {
    id: observation.id,
    name: observation.name,
    description: observation.description || undefined,
    type: ObservationType.Normal,
    mode: mapObservationMode(observation.mode),
    protocol,
    readings: convertMobileReadings(readings),
  };
}

