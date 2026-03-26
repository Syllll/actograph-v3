import {
  AUTO_CORRECT_SYNTH_NAMES,
  type IAutoCorrectAction,
} from '@actograph/core';
import type { Composer } from 'vue-i18n';

/**
 * Builds a locale-aware description for auto-correct actions (core keeps FR fallback strings).
 */
export function localizeAutoCorrectAction(
  action: IAutoCorrectAction,
  t: Composer['t'],
  d: Composer['d']
): string {
  const raw = action.relatedDate;
  const dateTime =
    raw != null
      ? d(raw instanceof Date ? raw : new Date(raw as unknown as string))
      : '';
  const count = action.count ?? 0;

  switch (action.reason) {
    case 'sort_chronological':
      return t('readingsUi.autoCorrectSortChronological');
    case 'dedupe_start':
      return t('readingsUi.autoCorrectDedupeStart', { count });
    case 'dedupe_stop':
      return t('readingsUi.autoCorrectDedupeStop', { count });
    case 'move_start_to_front':
      return t('readingsUi.autoCorrectMoveStartFront');
    case 'reposition_stop_after_last':
      return t('readingsUi.autoCorrectRepositionStop', { dateTime });
    case 'add_missing_stop':
      return t('readingsUi.autoCorrectAddStopAfterLast', { dateTime });
    case 'remove_unpaired_pause_starts':
      return t('readingsUi.autoCorrectRemoveUnpairedPauseStarts', { count });
    case 'add_missing_pause_start':
      return t('readingsUi.autoCorrectAddPauseStartBefore', { dateTime });
    case 'add_missing_pause_end':
      return t('readingsUi.autoCorrectAddPauseEndAfter', { dateTime });
    default:
      return action.description;
  }
}

/** Resolves auto-correct placeholder names to localized reading labels. */
export function localizeAutoCorrectReadingName(
  name: string | null | undefined,
  t: Composer['t']
): string {
  if (name == null || name === '') {
    return t('readings.defaultNewReading');
  }
  switch (name) {
    case AUTO_CORRECT_SYNTH_NAMES.chronicleEnd:
      return t('readings.defaultChronicleEnd');
    case AUTO_CORRECT_SYNTH_NAMES.pauseStart:
      return t('readings.defaultPauseStart');
    case AUTO_CORRECT_SYNTH_NAMES.pauseEnd:
      return t('readings.defaultPauseEnd');
    case AUTO_CORRECT_SYNTH_NAMES.newReading:
      return t('readings.defaultNewReading');
    default:
      return name;
  }
}
