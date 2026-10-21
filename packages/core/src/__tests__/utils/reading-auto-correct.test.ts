import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import {
  autoCorrectReadings,
  AUTO_CORRECT_SYNTH_NAMES,
} from '../../utils/reading-auto-correct';

function mk(
  partial: Pick<IReading, 'type' | 'dateTime'> &
    Partial<Omit<IReading, 'type' | 'dateTime'>>
): IReading {
  return {
    name: partial.name ?? 'r',
    type: partial.type,
    dateTime: partial.dateTime,
    id: partial.id,
    tempId: partial.tempId,
  };
}

describe('reading-auto-correct', () => {
  it('emits sort_chronological when readings are out of order', () => {
    const later = mk({
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2020-01-02T00:00:00.000Z'),
      tempId: 'a',
    });
    const earlier = mk({
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2020-01-01T00:00:00.000Z'),
      tempId: 'b',
    });
    const result = autoCorrectReadings([later, earlier], false);
    const sortAction = result.actions.find((a) => a.reason === 'sort_chronological');
    expect(sortAction).toBeDefined();
    expect(sortAction?.type).toBe('sort');
  });

  it('uses synthetic chronicle-end name when adding missing STOP', () => {
    const start = mk({
      type: ReadingTypeEnum.START,
      dateTime: new Date('2020-01-01T00:00:00.000Z'),
      tempId: 's',
    });
    const data = mk({
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2020-01-02T00:00:00.000Z'),
      tempId: 'd',
    });
    const result = autoCorrectReadings([start, data], false);
    const addStop = result.actions.find((a) => a.reason === 'add_missing_stop');
    expect(addStop?.newReading?.name).toBe(AUTO_CORRECT_SYNTH_NAMES.chronicleEnd);
    expect(addStop?.newReading?.type).toBe(ReadingTypeEnum.STOP);
  });

  it('dedupes extra START readings with count', () => {
    const t0 = new Date('2020-01-01T00:00:00.000Z');
    const start1 = mk({
      type: ReadingTypeEnum.START,
      dateTime: t0,
      id: 1,
    });
    const start2 = mk({
      type: ReadingTypeEnum.START,
      dateTime: new Date(t0.getTime() + 1000),
      id: 2,
    });
    const stop = mk({
      type: ReadingTypeEnum.STOP,
      dateTime: new Date(t0.getTime() + 2000),
      id: 3,
    });
    const result = autoCorrectReadings([start1, start2, stop], false);
    const dedupe = result.actions.find((a) => a.reason === 'dedupe_start');
    expect(dedupe).toBeDefined();
    expect(dedupe?.count).toBe(1);
  });

  it('uses synthetic pause names when adding missing PAUSE_START / PAUSE_END', () => {
    const t0 = new Date('2020-01-01T12:00:00.000Z');
    const start = mk({
      type: ReadingTypeEnum.START,
      dateTime: new Date(t0.getTime() - 2000),
      tempId: 's',
    });
    const pauseEndOnly = mk({
      type: ReadingTypeEnum.PAUSE_END,
      dateTime: t0,
      tempId: 'pe',
    });
    const stop = mk({
      type: ReadingTypeEnum.STOP,
      dateTime: new Date(t0.getTime() + 2000),
      tempId: 'st',
    });
    const result = autoCorrectReadings([start, pauseEndOnly, stop], false);
    const addPauseStart = result.actions.find(
      (a) => a.reason === 'add_missing_pause_start'
    );
    expect(addPauseStart?.newReading?.name).toBe(AUTO_CORRECT_SYNTH_NAMES.pauseStart);
  });

  it('applyCorrections uses synthetic names on created readings', () => {
    const start = mk({
      type: ReadingTypeEnum.START,
      dateTime: new Date('2020-01-01T00:00:00.000Z'),
      tempId: 's',
    });
    const data = mk({
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2020-01-02T00:00:00.000Z'),
      tempId: 'd',
    });
    const result = autoCorrectReadings([start, data], true);
    const stopReading = result.correctedReadings.find(
      (r) => r.type === ReadingTypeEnum.STOP
    );
    expect(stopReading?.name).toBe(AUTO_CORRECT_SYNTH_NAMES.chronicleEnd);
  });
});


describe('safe chronological correction', () => {
  const t0 = new Date('2026-10-21T08:00:00.000Z');
  it('keeps equal-time readings in input order, including rows without IDs', () => {
    const start = mk({ type: ReadingTypeEnum.START, dateTime: t0, id: 1 });
    const a = mk({ type: ReadingTypeEnum.DATA, dateTime: t0, name: 'A' });
    const b = mk({ type: ReadingTypeEnum.DATA, dateTime: t0, name: 'B' });
    const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date(+t0 + 1000), id: 2 });
    const input = [start, a, b, stop];
    expect(autoCorrectReadings(input).actions).toEqual([]);
    const result = autoCorrectReadings(input, true);
    expect(result.correctedReadings.map((r) => r.name)).toEqual(input.map((r) => r.name));
    expect(result.correctedReadings[0].dateTime).toEqual(t0);
  });

  it('sorts unsaved readings without changing their timestamps', () => {
    const earlier = mk({ type: ReadingTypeEnum.DATA, dateTime: t0 });
    const later = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date(+t0 + 1000) });
    const result = autoCorrectReadings([later, earlier], true);
    expect(result.actions.some((a) => a.reason === 'sort_chronological')).toBe(true);
    expect(result.correctedReadings.slice(0, 2).map((r) => r.dateTime)).toEqual([earlier.dateTime, later.dateTime]);
  });

  it.each([false, true])('reports invalid dates and applies no changes with apply=%p', (apply) => {
    const invalid = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date(NaN), id: 2 });
    const start = mk({ type: ReadingTypeEnum.START, dateTime: t0, id: 1 });
    const input = [start, invalid];
    const result = autoCorrectReadings(input, apply);
    expect(result.invalidReadings).toEqual([invalid]);
    expect(result.actions).toEqual([]);
    expect(result.correctedReadings).toEqual([]);
    expect(input).toEqual([start, invalid]);
  });

  it('does not mutate the input when repositioning session markers', () => {
    const start = mk({ type: ReadingTypeEnum.START, dateTime: new Date(+t0 + 1000), id: 1 });
    const data = mk({ type: ReadingTypeEnum.DATA, dateTime: t0, id: 2 });
    const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date(+t0 - 1000), id: 3 });
    const originalTimes = [start, data, stop].map((r) => +r.dateTime);
    autoCorrectReadings([start, data, stop], true);
    expect([start, data, stop].map((r) => +r.dateTime)).toEqual(originalTimes);
  });
});
