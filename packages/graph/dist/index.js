/**
 * @actograph/graph
 *
 * Activity graph component using PixiJS.
 * This package provides a shared graph component for front/ and mobile/.
 */
// Classe PixiApp principale
export { PixiApp } from './pixi-app';
export { DEFAULT_GRAPH_RENDER_OPTIONS } from './types/graph-render-options';
export { computePauseOverlayRects, shouldDrawPauseOverlay, resolveMaskPausesOption, } from './utils/pause-overlay.utils';
// Utilitaires
export { getObservableGraphPreferences, parseProtocolItems, hydrateProtocolItemsFromStringIfNeeded, } from './utils/protocol.utils';
export { formatCompact, formatFromDate, millisecondsToParts } from './utils/duration.utils';
export { CHRONOMETER_T0 } from './utils/chronometer.constants';
export { getGraphPausePeriods } from './utils/pause-periods.utils';
export { DEFAULT_GRAPH_COLOR } from './lib/graph-defaults';
export { ObservationModeEnum, ReadingTypeEnum, BackgroundPatternEnum, DisplayModeEnum, ProtocolItemActionEnum, ProtocolItemTypeEnum, TimeDisplayFormatEnum, } from '@actograph/core';
//# sourceMappingURL=index.js.map