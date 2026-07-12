/**
 * @actograph/graph
 *
 * Activity graph component using PixiJS.
 * This package provides a shared graph component for front/ and mobile/.
 */

// Classe PixiApp principale
export { PixiApp } from './pixi-app';

// Options de rendu graphe (niveau session, pas par catégorie)
export type { IGraphRenderOptions } from './types/graph-render-options';
export { DEFAULT_GRAPH_RENDER_OPTIONS } from './types/graph-render-options';
export {
  computePauseOverlayRects,
  shouldDrawPauseOverlay,
  resolveMaskPausesOption,
} from './utils/pause-overlay.utils';
export type { PauseOverlayRect, PauseOverlayBounds } from './utils/pause-overlay.utils';

// Utilitaires
export {
  getObservableGraphPreferences,
  parseProtocolItems,
  hydrateProtocolItemsFromStringIfNeeded,
} from './utils/protocol.utils';
export { formatCompact, formatFromDate, millisecondsToParts } from './utils/duration.utils';
export { CHRONOMETER_T0 } from './utils/chronometer.constants';
export { getGraphPausePeriods } from './utils/pause-periods.utils';
export { DEFAULT_GRAPH_COLOR } from './lib/graph-defaults';

// Réexporter les types de @actograph/core pour commodité
export type {
  IObservation,
  IProtocol,
  IProtocolItem,
  IReading,
  IGraphPreferences,
  IPeriod,
} from '@actograph/core';

export {
  ObservationModeEnum,
  ReadingTypeEnum,
  BackgroundPatternEnum,
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@actograph/core';

