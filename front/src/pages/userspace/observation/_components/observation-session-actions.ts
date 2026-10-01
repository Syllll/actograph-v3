import { createDialog } from '@lib-improba/utils/dialog.utils';
import { ReadingTypeEnum } from '@services/observations/interface';
import type { useObservation } from 'src/composables/use-observation';
import TerminateObservationDialog from './TerminateObservationDialog.vue';

type ObservationComposable = ReturnType<typeof useObservation>;

export function isProtocolMissing(observation: ObservationComposable): boolean {
  return observation.protocol.methods.isProtocolEmpty(
    observation.protocol.sharedState.currentProtocol,
  );
}

export function isSessionStarted(observation: ObservationComposable): boolean {
  if (observation.sharedState.isPlaying || observation.sharedState.elapsedTime > 0) {
    return true;
  }
  return observation.readings.sharedState.currentReadings.some(
    (reading) => reading.type === ReadingTypeEnum.START,
  );
}

/** Ends the session: STOP reading + reset timer state (no auto-correct). */
export function completeObservationStop(observation: ObservationComposable): void {
  observation.timerMethods.stopTimer();
}

/**
 * Terminate flow: confirmation, stopTimer, then auto-correct readings.
 * Must not be used for Pause or video @ended.
 */
export async function confirmAndCompleteObservationStop(
  observation: ObservationComposable,
): Promise<void> {
  if (isProtocolMissing(observation) && !isSessionStarted(observation)) {
    return;
  }

  const confirmed = await createDialog({
    component: TerminateObservationDialog,
    persistent: true,
  });

  if (!confirmed) {
    return;
  }

  completeObservationStop(observation);
  observation.readings.methods.autoCorrectReadings(true);
}

/** Pause (Rec ↔ Pause CTA and video @ended). Session chip is derived in the bar. */
export function pauseObservationWithFeedback(
  observation: ObservationComposable,
): void {
  if (!observation.sharedState.isPlaying) {
    return;
  }

  observation.timerMethods.pauseTimer();
}

export function hasAnyStopReading(observation: ObservationComposable): boolean {
  return observation.readings.sharedState.currentReadings.some(
    (reading) => reading.type === ReadingTypeEnum.STOP,
  );
}

/** Single Rec ↔ Pause CTA: startTimer or pauseTimer. */
export function handleRecPauseClick(observation: ObservationComposable): void {
  if (isProtocolMissing(observation)) {
    return;
  }

  if (observation.sharedState.isPlaying) {
    pauseObservationWithFeedback(observation);
    return;
  }

  observation.timerMethods.startTimer();
}
