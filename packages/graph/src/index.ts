/**
 * @actograph/graph
 *
 * Activity graph component using PixiJS.
 * This package provides a shared graph component for front/ and mobile/.
 */

// Classe PixiApp principale
export { PixiApp } from './pixi-app';

// Utilitaires
export { getObservableGraphPreferences, parseProtocolItems } from './utils/protocol.utils';
export { formatCompact, formatFromDate, millisecondsToParts } from './utils/duration.utils';
export { CHRONOMETER_T0 } from './utils/chronometer.constants';

// Réexporter les types de @actograph/core pour commodité
export type {
  IObservation,
  IProtocol,
  IProtocolItem,
  IReading,
  IGraphPreferences,
} from '@actograph/core';

export {
  ObservationModeEnum,
  ReadingTypeEnum,
  BackgroundPatternEnum,
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@actograph/core';

