import type {
  IGraphPreferences,
  IObservation,
  IPeriod,
  IProtocol,
  IReading,
} from '@actograph/core';
import { DisplayModeEnum } from '@actograph/core';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import type { ProtocolItem } from '../utils/protocol.utils';

export interface GraphAxisBounds {
  bottomLeft: { x: number; y: number };
  topRight: { x: number; y: number };
}

export interface GraphFriezeInfo {
  startY: number;
  endY: number;
  height: number;
  centerY: number;
}

export interface CategoryReadingsEntry {
  readonly category: ProtocolItem;
  readonly readings: readonly IReading[];
}

/**
 * Shared read-only context passed to layers during prepare().
 */
export interface GraphContext {
  readonly observation: IObservation | null;
  readonly protocol: IProtocol | null;
  readonly patternStore: PatternTextureStore;
  readonly graphRenderOptions: IGraphRenderOptions;
  readonly axisStretch: { x: number; y: number };
  readonly pausePeriods: readonly IPeriod[];
  readonly readingsPerCategory: ReadonlyArray<CategoryReadingsEntry>;
  readonly getYPos: (categoryId: string, observableName: string) => number;
  readonly getDateTimePos: (date: Date | string) => number;
  readonly getAxisBounds: () => GraphAxisBounds | null;
  readonly getFriezeInfo: (categoryId: string) => GraphFriezeInfo | null;
  readonly getObservablePreferences: (
    category: ProtocolItem,
    observableName: string,
  ) => IGraphPreferences | null;
  readonly getCategoryById: (categoryId: string) => ProtocolItem | null;
  readonly getEffectiveDisplayMode: (category: ProtocolItem) => DisplayModeEnum;
}
