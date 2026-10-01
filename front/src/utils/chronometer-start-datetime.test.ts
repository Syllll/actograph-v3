import { ReadingTypeEnum, isRecordingActiveFromReadings } from '@actograph/core';
import { CHRONOMETER_T0 } from './chronometer.constants';
import {
  chronometerDateTimeFromElapsed,
  resolveChronometerStartDateTime,
} from './chronometer-start-datetime';

describe('chronometerDateTimeFromElapsed', () => {
  it('maps elapsed seconds onto t0', () => {
    expect(chronometerDateTimeFromElapsed(40).getTime()).toBe(
      CHRONOMETER_T0.getTime() + 40_000,
    );
  });
});

describe('resolveChronometerStartDateTime', () => {
  it('keeps the first session START at t0', () => {
    expect(resolveChronometerStartDateTime([], 17).getTime()).toBe(CHRONOMETER_T0.getTime());
  });

  it('places a new START after the last STOP so recording is active again', () => {
    const start = { type: ReadingTypeEnum.START, dateTime: CHRONOMETER_T0 };
    const stop = {
      type: ReadingTypeEnum.STOP,
      dateTime: new Date(CHRONOMETER_T0.getTime() + 17_000),
    };

    const nextStart = resolveChronometerStartDateTime([start, stop], 0);

    expect(nextStart.getTime()).toBe(stop.dateTime.getTime() + 1);
    expect(isRecordingActiveFromReadings([start, stop, {
      type: ReadingTypeEnum.START,
      dateTime: nextStart,
    }])).toBe(true);
  });

  it('uses the playhead when it is already after the last STOP', () => {
    const stop = {
      type: ReadingTypeEnum.STOP,
      dateTime: new Date(CHRONOMETER_T0.getTime() + 17_000),
    };
    const nextStart = resolveChronometerStartDateTime([stop], 40);

    expect(nextStart.getTime()).toBe(CHRONOMETER_T0.getTime() + 40_000);
  });
});
