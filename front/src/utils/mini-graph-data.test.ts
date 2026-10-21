import { ObservationType, ReadingTypeEnum, getGraphDisplayTimeBounds, type IObservation } from '@actograph/core';
import { buildMiniGraphObservation } from './mini-graph-data';
const at = (n: number) => new Date(100000 + n * 1000);
const reading = (type: ReadingTypeEnum, n: number) => ({ name: 'Activity', type, dateTime: at(n) });
const base = (): IObservation => ({ name: 'Test', type: ObservationType.Normal,
  protocol: { name: 'Protocol', items: [] }, readings: [reading(ReadingTypeEnum.START, 0), reading(ReadingTypeEnum.DATA, 2)] });

it('extends an open session without changing source readings, dates or protocol', () => {
  const source = base();
  const before = JSON.stringify(source);
  const result = buildMiniGraphObservation(source, +at(10));
  expect(getGraphDisplayTimeBounds(result.readings!)).toEqual({ startMs: +at(0), endMs: +at(10) });
  expect(JSON.stringify(source)).toBe(before);
  expect(result.protocol).not.toBe(source.protocol);
  expect(result.readings![0]!.dateTime).not.toBe(source.readings![0]!.dateTime);
  expect(result.readings!.at(-1)!.type).toBe(ReadingTypeEnum.STOP);
});

it('keeps the actual STOP of a completed session', () => {
  const source = base(); source.readings!.push(reading(ReadingTypeEnum.STOP, 5));
  expect(buildMiniGraphObservation(source, +at(20)).readings).toHaveLength(3);
  expect(getGraphDisplayTimeBounds(buildMiniGraphObservation(source, +at(20)).readings!)?.endMs).toBe(+at(5));
});

it('extends only the resumed session and preserves pauses and earlier boundaries', () => {
  const source = base(); source.readings!.push(reading(ReadingTypeEnum.STOP, 5), reading(ReadingTypeEnum.START, 8),
    reading(ReadingTypeEnum.DATA, 9), reading(ReadingTypeEnum.PAUSE_START, 10));
  const result = buildMiniGraphObservation(source, +at(10));
  expect(result.readings!.filter(r => r.type === ReadingTypeEnum.STOP)).toHaveLength(2);
  expect(result.readings!.find(r => r.type === ReadingTypeEnum.PAUSE_START)?.dateTime).toEqual(at(10));
});

it('keeps later recorded data when the video position moves backwards', () => {
  const source = base(); source.readings!.push(reading(ReadingTypeEnum.DATA, 12));
  const result = buildMiniGraphObservation(source, +at(4));
  expect(getGraphDisplayTimeBounds(result.readings!)?.endMs).toBe(+at(12));
});

it.each([null, NaN, Infinity])('does not invent a runtime end for %p', (time) => {
  expect(buildMiniGraphObservation(base(), time).readings).toHaveLength(2);
});

it('does not invent an end in manual entry and drops invalid dates from its render copy only', () => {
  const source = base(); source.meta = { entryMode: 'manual' };
  source.readings!.push({ ...reading(ReadingTypeEnum.DATA, 3), dateTime: new Date('bad') });
  expect(buildMiniGraphObservation(source, +at(20)).readings).toHaveLength(2);
  expect(source.readings).toHaveLength(3);
});
