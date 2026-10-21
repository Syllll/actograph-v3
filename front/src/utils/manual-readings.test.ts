/** @jest-environment jsdom */
import { nextTick } from 'vue';
import { useReadings } from '../composables/use-observation/use-readings';
import { readingService } from '../services/observations/reading.service';
import { IObservation, IReading, ObservationModeEnum, ReadingTypeEnum } from '../services/observations/interface';
import { CHRONOMETER_T0 } from './chronometer.constants';
import { readingKey, sameReading } from './reading-identity';

jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, d: String }) }));
jest.mock('../services/observations/reading.service', () => ({
  readingService: { findWithPagination: jest.fn(), createMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../composables/use-window-sync', () => ({
  useWindowSync: () => ({ isOwner: false, isApplyingRemote: () => false, broadcast: jest.fn(), on: jest.fn() }),
}));

const api = jest.mocked(readingService);
const state = {
  currentObservation: { id: 7, mode: ObservationModeEnum.Calendar },
  currentDate: null as Date | null,
  elapsedTime: 0,
};
const { methods, sharedState } = useReadings({ sharedStateFromObservation: state });
const time = new Date('2026-10-20T08:00:00.123Z');
const row = (id: number, name: string, dateTime = time): IReading => ({
  id, name, type: ReadingTypeEnum.DATA, dateTime: new Date(dateTime), description: 'Notes',
});
const load = async (rows: IReading[]) => {
  api.findWithPagination.mockResolvedValue({ results: rows, count: rows.length } as never);
  await methods.loadReadings(state.currentObservation as IObservation);
};
const gate = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(async () => {
  jest.clearAllMocks();
  state.currentObservation = { id: 7, mode: ObservationModeEnum.Calendar };
  state.currentDate = null;
  state.elapsedTime = 0;
  api.createMany.mockImplementation(async ({ readings }) => readings.map((reading, index) => ({ ...reading, id: 100 + index })));
  api.updateMany.mockResolvedValue([]);
  api.deleteMany.mockResolvedValue(undefined);
  await load([]);
});

describe('manual addition through the real readings composable', () => {
  it('copies the selected row directly below it without changing its time or identity', async () => {
    await load([row(1, 'A'), row(2, 'B'), row(3, 'C')]);
    methods.selectReading(sharedState.currentReadings[0]);
    const added = methods.addManualReading();
    expect(sharedState.currentReadings.map((r) => r.name)).toEqual(['A', 'A', 'B', 'C']);
    expect(added).toMatchObject({ name: 'A', description: 'Notes', type: ReadingTypeEnum.DATA, dateTime: time });
    expect(added.id).toBeUndefined();
    expect(added.tempId).toBeTruthy();
    expect(added.dateTime).not.toBe(sharedState.currentReadings[0].dateTime);
    expect(sameReading(sharedState.selectedReading, added)).toBe(true);
    expect(sharedState.currentReadings.map((r) => r.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('chains repeated additions from the newly selected copy', async () => {
    await load([row(1, 'A'), row(2, 'B')]);
    methods.selectReading(sharedState.currentReadings[0]);
    const first = methods.addManualReading();
    const second = methods.addManualReading();
    expect(sharedState.currentReadings.map(readingKey)).toEqual(['id-1', readingKey(first), readingKey(second), 'id-2']);
    expect(first.tempId).not.toBe(second.tempId);
    expect(sameReading(sharedState.selectedReading, second)).toBe(true);
  });

  it('uses the last row rather than the wall clock when nothing is selected', async () => {
    await load([row(1, 'A'), row(2, 'B')]);
    const added = methods.addManualReading();
    expect(added.name).toBe('B');
    expect(added.dateTime).toEqual(time);
    expect(sharedState.currentReadings[2].tempId).toBe(added.tempId);
  });

  it('resolves a selection replaced by an edit instead of copying stale values', async () => {
    await load([row(1, 'A')]);
    methods.selectReading(sharedState.currentReadings[0]);
    methods.updateReading({ id: 1 }, { name: 'Edited', description: 'New notes' });
    const added = methods.addManualReading();
    expect(added).toMatchObject({ name: 'Edited', description: 'New notes' });
  });

  it('preserves an explicitly empty legacy label when copying a source row', async () => {
    await load([row(1, '')]);
    methods.selectReading(sharedState.currentReadings[0]);
    expect(methods.addManualReading().name).toBe('');
  });

  it.each([ReadingTypeEnum.START, ReadingTypeEnum.STOP, ReadingTypeEnum.PAUSE_START, ReadingTypeEnum.PAUSE_END, ReadingTypeEnum.DATA])('keeps the source type %s', async (type) => {
    await load([{ ...row(1, 'Source'), type }]);
    expect(methods.addManualReading().type).toBe(type);
  });

  it('creates and selects the first calendar row without starting a session', () => {
    const before = Date.now();
    const added = methods.addManualReading();
    expect(added.type).toBe(ReadingTypeEnum.DATA);
    expect(added.dateTime.getTime()).toBeGreaterThanOrEqual(before);
    expect(added.sortOrder).toBe(0);
    expect(sameReading(sharedState.selectedReading, added)).toBe(true);
    expect(state.currentDate).toBeNull();
  });

  it('creates the first chronometer/video row at the current elapsed time', () => {
    state.currentObservation.mode = ObservationModeEnum.Chronometer;
    state.elapsedTime = 42.123;
    expect(methods.addManualReading().dateTime.getTime()).toBe(CHRONOMETER_T0.getTime() + 42_123);
  });

  it('keeps the selection after a time edit moves the row', async () => {
    await load([row(1, 'A'), row(2, 'B')]);
    const added = methods.addManualReading();
    methods.updateReading({ tempId: added.tempId }, { dateTime: new Date(time.getTime() - 1000) });
    expect(sharedState.currentReadings[0].tempId).toBe(added.tempId);
    expect(sharedState.selectedReading?.dateTime.getTime()).toBe(time.getTime() - 1000);
  });

  it('clears selection on deletion, clear all and loading another chronicle', async () => {
    const first = methods.addManualReading();
    methods.removeReading(first);
    expect(sharedState.selectedReading).toBeNull();
    methods.addManualReading();
    methods.removeAllReadings();
    expect(sharedState.selectedReading).toBeNull();
    methods.addManualReading();
    await load([row(4, 'Other')]);
    expect(sharedState.selectedReading).toBeNull();
    expect(methods.addManualReading().name).toBe('Other');
  });

  it('does not move the manual selection when a live reading arrives', async () => {
    await load([row(1, 'A')]);
    methods.selectReading(sharedState.currentReadings[0]);
    methods.addReading({ name: 'Live', dateTime: new Date(time.getTime() + 1000) });
    expect(sharedState.selectedReading?.id).toBe(1);
  });

  it('keeps capture order at a frozen timestamp even while another row is selected', async () => {
    await load([row(1, 'Source')]);
    methods.selectReading(sharedState.currentReadings[0]);
    methods.addReading({ name: 'First', dateTime: time });
    methods.addReading({ name: 'Second', dateTime: time });
    expect(sharedState.currentReadings.map((r) => r.name)).toEqual(['Source', 'First', 'Second']);
    expect(sharedState.selectedReading?.id).toBe(1);
  });
});

describe('manual readings synchronization', () => {
  it('does not rewrite a large legacy chronicle just because it was opened', async () => {
    await load(Array.from({ length: 1000 }, (_, index) => row(index + 1, `Reading ${index}`)));
    await methods.synchronizeReadings();
    expect(api.updateMany).not.toHaveBeenCalled();
    expect(api.createMany).not.toHaveBeenCalled();
  });

  it('persists shifted positions before creating an equal-time copy', async () => {
    await load([{ ...row(1, 'A'), sortOrder: 0 }, { ...row(2, 'B'), sortOrder: 1 }]);
    methods.selectReading(sharedState.currentReadings[0]);
    methods.addManualReading();
    const pending = gate<IReading[]>();
    api.updateMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    expect(api.updateMany).toHaveBeenCalledWith(expect.objectContaining({ readings: [expect.objectContaining({ id: 2, sortOrder: 2 })] }));
    expect(api.createMany).not.toHaveBeenCalled();
    pending.resolve([]);
    await syncing;
    expect(api.createMany).toHaveBeenCalledTimes(1);
    expect(api.updateMany.mock.invocationCallOrder[0]).toBeLessThan(api.createMany.mock.invocationCallOrder[0]);
  });

  it('keeps the local copy selected and never POSTs if persisting the shifted order fails', async () => {
    await load([{ ...row(1, 'A'), sortOrder: 0 }, { ...row(2, 'B'), sortOrder: 1 }]);
    methods.selectReading(sharedState.currentReadings[0]);
    const added = methods.addManualReading();
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      api.updateMany.mockRejectedValueOnce(new Error('Offline')).mockRejectedValueOnce(new Error('Offline')).mockRejectedValueOnce(new Error('Offline'));
      const assertion = expect(methods.synchronizeReadings()).rejects.toThrow('Offline');
      await jest.runAllTimersAsync();
      await assertion;
      expect(api.createMany).not.toHaveBeenCalled();
      expect(sameReading(sharedState.selectedReading, added)).toBe(true);
      await methods.synchronizeReadings();
      expect(api.createMany).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
      jest.useRealTimers();
    }
  });

  it('sends new identities and equal-time order, then preserves selection after server ID assignment', async () => {
    await load([row(1, 'A'), row(2, 'B')]);
    methods.selectReading(sharedState.currentReadings[0]);
    const added = methods.addManualReading();
    const key = readingKey(added);
    await methods.synchronizeReadings();
    expect(api.createMany).toHaveBeenCalledWith(expect.objectContaining({
      observationId: 7, readings: [expect.objectContaining({ tempId: added.tempId, sortOrder: 1, dateTime: time })],
    }));
    expect(api.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      readings: expect.arrayContaining([expect.objectContaining({ id: 2, sortOrder: 2 })]),
    }));
    expect(sharedState.selectedReading?.id).toBe(100);
    expect(readingKey(sharedState.selectedReading!)).toBe(key);
    await methods.synchronizeReadings();
    expect(api.createMany).toHaveBeenCalledTimes(1);
  });

  it('persists edits made while the initial creation request is pending', async () => {
    const added = methods.addManualReading();
    const pending = gate<IReading[]>();
    api.createMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    methods.updateReading({ tempId: added.tempId }, { name: 'Edited during POST' });
    pending.resolve([{ ...added, id: 100 }]);
    await syncing;
    await methods.synchronizeReadings();
    expect(api.updateMany).toHaveBeenCalledWith(expect.objectContaining({ readings: [expect.objectContaining({ id: 100, name: 'Edited during POST' })] }));
    expect(sharedState.selectedReading?.name).toBe('Edited during POST');
  });

  it('retries a lost POST response with the same temporary identity', async () => {
    const added = methods.addManualReading();
    const committed = { ...added, id: 100 };
    api.createMany.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce([committed]);
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const syncing = methods.synchronizeReadings();
      await jest.runAllTimersAsync();
      await syncing;
      expect(api.createMany).toHaveBeenCalledTimes(2);
      expect(api.createMany.mock.calls[0][0]).toEqual(api.createMany.mock.calls[1][0]);
      expect(sharedState.currentReadings).toHaveLength(1);
      expect(sharedState.selectedReading?.id).toBe(100);
      await methods.synchronizeReadings();
      expect(api.createMany).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
      jest.useRealTimers();
    }
  });

  it('does not lose a second addition made during creation of the first', async () => {
    const first = methods.addManualReading();
    const pending = gate<IReading[]>();
    api.createMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    const second = methods.addManualReading();
    pending.resolve([{ ...first, id: 100 }]);
    await syncing;
    await methods.synchronizeReadings();
    expect(api.createMany.mock.calls[1][0].readings).toEqual([expect.objectContaining({ tempId: second.tempId })]);
    expect(sameReading(sharedState.selectedReading, second)).toBe(true);
  });

  it('deletes a server copy when its row was deleted during creation', async () => {
    const first = methods.addManualReading();
    const pending = gate<IReading[]>();
    api.createMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    methods.removeReading(first);
    pending.resolve([{ ...first, id: 100 }]);
    await syncing;
    await methods.synchronizeReadings();
    expect(api.deleteMany).toHaveBeenCalledWith({ observationId: 7, ids: [100] });
    expect(sharedState.currentReadings).toHaveLength(0);
  });

  it('does not acknowledge edits made during an update request', async () => {
    await load([{ ...row(1, 'A'), sortOrder: 0 }]);
    methods.updateReading({ id: 1 }, { name: 'First edit' });
    const pending = gate<IReading[]>();
    api.updateMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    methods.updateReading({ id: 1 }, { name: 'Second edit' });
    pending.resolve([]);
    await syncing;
    await methods.synchronizeReadings();
    expect(api.updateMany.mock.calls.map(([payload]) => payload.readings[0].name)).toEqual(['First edit', 'Second edit']);
  });

  it('ignores the response of a chronicle closed while saving', async () => {
    const first = methods.addManualReading();
    const pending = gate<IReading[]>();
    api.createMany.mockReturnValueOnce(pending.promise);
    const syncing = methods.synchronizeReadings();
    state.currentObservation = { id: 8, mode: ObservationModeEnum.Calendar };
    await load([row(3, 'Other')]);
    pending.resolve([{ ...first, id: 100 }]);
    await syncing;
    expect(sharedState.currentReadings.map((r) => r.name)).toEqual(['Other']);
    expect(sharedState.selectedReading).toBeNull();
    await nextTick();
  });
});


describe('manual initialization and correction integration', () => {
  it.each([ObservationModeEnum.Calendar, ObservationModeEnum.Chronometer])('creates a correctly timestamped START for manual %s', async (mode) => {
    state.currentObservation = { id: 7, mode };
    const before = Date.now();
    await methods.addStartReading();
    expect(sharedState.currentReadings[0].type).toBe(ReadingTypeEnum.START);
    if (mode === ObservationModeEnum.Chronometer) expect(sharedState.currentReadings[0].dateTime).toEqual(CHRONOMETER_T0);
    else expect(+sharedState.currentReadings[0].dateTime).toBeGreaterThanOrEqual(before);
  });

  it('adds a data reading after a manual START rather than duplicating the marker', async () => {
    Object.assign(state.currentObservation, { meta: { entryMode: 'manual' } });
    await methods.addStartReading();
    const start = sharedState.currentReadings[0];
    methods.selectReading(start);
    const added = methods.addManualReading();
    expect(added.type).toBe(ReadingTypeEnum.DATA);
    expect(added.name).toBe('readings.defaultNewReading');
    expect(added.dateTime).toEqual(start.dateTime);
    expect(sharedState.currentReadings.filter((r) => r.type === ReadingTypeEnum.START)).toHaveLength(1);
  });

  it('preserves all readings when automatic correction encounters an invalid timestamp', async () => {
    await load([row(1, 'Invalid', new Date(NaN)), row(2, 'Valid')]);
    const before = [...sharedState.currentReadings];
    const result = methods.autoCorrectReadings(true);
    expect(result.invalidReadings).toHaveLength(1);
    expect(sharedState.currentReadings).toEqual(before);
  });

  it('uses the confirmed end time and preserves equal-time data order', async () => {
    await load([{ ...row(1, 'Start'), type: ReadingTypeEnum.START }, row(2, 'A'), row(3, 'B')]);
    const end = new Date(+time + 60000);
    methods.autoCorrectReadings(true, end);
    expect(sharedState.currentReadings.map((r) => r.name)).toEqual(['Start', 'A', 'B', 'readings.defaultChronicleEnd']);
    expect(sharedState.currentReadings[3].dateTime).toEqual(end);
    expect(sharedState.currentReadings[0].dateTime).toEqual(time);
  });

  it('rejects an end time before the last reading without changing the original readings', async () => {
    await load([{ ...row(1, 'Start'), type: ReadingTypeEnum.START }, row(2, 'Data', new Date(+time + 1000))]);
    const before = sharedState.currentReadings.map((r) => ({ ...r }));
    expect(() => methods.autoCorrectReadings(true, time)).toThrow(RangeError);
    expect(sharedState.currentReadings).toEqual(before);
  });
});
