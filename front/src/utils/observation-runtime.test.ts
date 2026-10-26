/** @jest-environment jsdom */
import { nextTick, reactive } from 'vue';
import { useObservation } from '../composables/use-observation';
import { observationService } from '../services/observations/index.service';
import { IObservation, IReading, IProtocol, ObservationModeEnum, ReadingTypeEnum } from '../services/observations/interface';
import { protocolService } from '../services/observations/protocol.service';
import {
  deletingObservationIds,
  markObservationDeleted,
  setObservationMutationBlocked,
  waitForObservationTasks,
} from './observation-mutation-guard';

jest.mock('../composables/use-observation/use-readings', () => ({ useReadings: () => mockReadings }));
jest.mock('../composables/use-observation/use-protocol', () => ({ useProtocol: () => mockProtocol }));
jest.mock('../services/observations/index.service', () => ({ observationService: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() } }));
jest.mock('../services/observations/protocol.service', () => ({ protocolService: { findOneFromObservationId: jest.fn() } }));
jest.mock('../composables/use-window-sync', () => ({
  useWindowSync: () => ({ get isOwner() { return mockOwner; }, isApplyingRemote: () => true, broadcast: jest.fn(), on: jest.fn(), setObservationId: jest.fn() }),
}));

let mockOwner = false;
const mockReadings = {
  sharedState: reactive({ currentReadings: [] as IReading[], selectedReading: null as IReading | null }),
  methods: {
    loadReadings: jest.fn().mockResolvedValue(undefined),
    selectReading: jest.fn(),
    addStartReading: jest.fn(), addPauseStartReading: jest.fn(), addPauseEndReading: jest.fn(), addStopReading: jest.fn(),
  },
};
const mockProtocol = {
  sharedState: reactive({ currentProtocol: null }),
  methods: { loadProtocol: jest.fn().mockResolvedValue(undefined) },
};
const observation = useObservation();
const base = (manual = false, mode = ObservationModeEnum.Calendar) => ({
  id: 11, name: 'Notes', mode, ...(manual ? { meta: { entryMode: 'manual' } } : {}),
} as IObservation);

beforeEach(() => {
  mockOwner = false;
  jest.useFakeTimers();
  observation.methods.closeObservation();
  jest.clearAllMocks();
  deletingObservationIds.clear();
});
afterEach(async () => {
  observation.methods.closeObservation();
  await nextTick();
  jest.useRealTimers();
});

it.each([ObservationModeEnum.Calendar, ObservationModeEnum.Chronometer])('blocks all timer side effects for manual %s even through stale callbacks', (mode) => {
  observation.sharedState.currentObservation = base(true, mode);
  observation.timerMethods.startTimer();
  observation.timerMethods.pauseTimer();
  observation.timerMethods.stopTimer();
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(observation.sharedState.startTime).toBeNull();
  expect(mockReadings.methods.addStartReading).not.toHaveBeenCalled();
  expect(mockReadings.methods.addPauseStartReading).not.toHaveBeenCalled();
  expect(mockReadings.methods.addPauseEndReading).not.toHaveBeenCalled();
  expect(mockReadings.methods.addStopReading).not.toHaveBeenCalled();
});

it('clears runtime recording state when reopening a chronicle with historical readings', async () => {
  observation.sharedState.currentObservation = base();
  observation.timerMethods.startTimer();
  expect(observation.sharedState.isPlaying).toBe(true);
  const historical = base();
  mockReadings.methods.loadReadings.mockImplementationOnce(async () => {
    mockReadings.sharedState.currentReadings = [{ name: 'Old start', type: ReadingTypeEnum.START, dateTime: new Date('2022-06-24T08:00:00.000Z') }];
  });
  jest.mocked(observationService.findOne).mockResolvedValueOnce(historical);
  await observation.methods.loadObservation(historical.id);
  expect(observation.sharedState.currentObservation?.id).toBe(11);
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(observation.sharedState.startTime).toBeNull();
  expect(observation.sharedState.elapsedTime).toBe(0);
  expect(observation.sharedState.currentDate).toBeNull();
});

it('starts, pauses, resumes and ends a live runtime session', () => {
  observation.sharedState.currentObservation = base();
  observation.timerMethods.startTimer();
  expect(observation.sharedState.isPlaying).toBe(true);
  expect(observation.sharedState.startTime).not.toBeNull();
  observation.timerMethods.pauseTimer();
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(observation.sharedState.startTime).not.toBeNull();
  observation.timerMethods.startTimer();
  expect(observation.sharedState.isPlaying).toBe(true);
  observation.timerMethods.stopTimer();
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(observation.sharedState.startTime).toBeNull();
  expect(mockReadings.methods.addStopReading).toHaveBeenCalledTimes(1);
});

it('starts a new runtime after an unmatched historical START and only resumes after a real pause', () => {
  observation.sharedState.currentObservation = base();
  const historicalTime = new Date('2022-06-24T08:00:00.000Z');
  mockReadings.sharedState.currentReadings = [{ name: 'Old start', type: ReadingTypeEnum.START, dateTime: historicalTime }];
  mockReadings.methods.addStartReading.mockImplementationOnce(() => {
    mockReadings.sharedState.currentReadings.push({
      name: 'New runtime start', type: ReadingTypeEnum.START,
      dateTime: new Date(observation.sharedState.currentDate!),
    });
  });
  observation.timerMethods.startTimer();
  expect(mockReadings.methods.addStartReading).toHaveBeenCalledTimes(1);
  expect(mockReadings.methods.addPauseEndReading).not.toHaveBeenCalled();
  expect(mockReadings.sharedState.currentReadings[1].dateTime.getTime()).toBeGreaterThan(historicalTime.getTime());
  observation.timerMethods.pauseTimer();
  observation.timerMethods.startTimer();
  expect(mockReadings.methods.addStartReading).toHaveBeenCalledTimes(1);
  expect(mockReadings.methods.addPauseEndReading).toHaveBeenCalledTimes(1);
});


it.each([ObservationModeEnum.Calendar, ObservationModeEnum.Chronometer])('initializes an empty manual %s chronicle once without starting a timer', async (mode) => {
  mockOwner = true;
  mockReadings.methods.addStartReading.mockImplementationOnce(() => {
    mockReadings.sharedState.currentReadings.push({ type: ReadingTypeEnum.START, name: 'Start', dateTime: new Date() });
  });
  const manual = base(true, mode);
  await observation.methods._loadObservation(manual);
  expect(mockReadings.methods.addStartReading).toHaveBeenCalledTimes(1);
  expect(mockReadings.methods.selectReading).toHaveBeenCalledWith(mockReadings.sharedState.currentReadings[0]);
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(observation.sharedState.startTime).toBeNull();
  mockReadings.methods.loadReadings.mockImplementationOnce(async () => {
    mockReadings.sharedState.currentReadings = [{ type: ReadingTypeEnum.START, name: 'Existing', dateTime: new Date() }];
  });
  await observation.methods._loadObservation(manual);
  expect(mockReadings.methods.addStartReading).toHaveBeenCalledTimes(1);
});

it('does not initialize manual readings in a follower window', async () => {
  await observation.methods._loadObservation(base(true));
  expect(mockReadings.methods.addStartReading).not.toHaveBeenCalled();
});

it('leaves empty live chronicles unchanged', async () => {
  mockOwner = true;
  await observation.methods._loadObservation(base());
  expect(mockReadings.methods.addStartReading).not.toHaveBeenCalled();
});

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const flushPromises = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

it('does not reopen a deleted chronicle from a previously started findOne', async () => {
  const current = { ...base(), id: 101 };
  const deleted = { ...base(), id: 102 };
  observation.sharedState.currentObservation = current;
  const find = deferred<IObservation>();
  jest.mocked(observationService.findOne).mockReturnValueOnce(find.promise);
  const load = observation.methods.loadObservation(deleted.id);
  await flushPromises();
  markObservationDeleted(deleted.id);
  find.resolve(deleted);
  await load;
  expect(observation.sharedState.currentObservation?.id).toBe(current.id);
  expect(mockReadings.methods.loadReadings).not.toHaveBeenCalled();
  expect(observation.sharedState.loading).toBe(false);

  await observation.methods.loadObservation(deleted.id);
  await observation.methods._loadObservation(deleted);
  expect(observationService.findOne).toHaveBeenCalledTimes(1);
  expect(observation.sharedState.currentObservation?.id).toBe(current.id);
});

it('drains a load already in progress before allowing deletion to finish', async () => {
  const target = { ...base(), id: 103 };
  const find = deferred<IObservation>();
  jest.mocked(observationService.findOne).mockReturnValueOnce(find.promise);
  const load = observation.methods.loadObservation(target.id);
  await flushPromises();
  setObservationMutationBlocked(target.id, true);
  let idle = false;
  const drain = waitForObservationTasks(target.id).then(() => { idle = true; });
  await flushPromises();
  expect(idle).toBe(false);
  find.resolve(target);
  await Promise.all([load, drain]);
  expect(idle).toBe(true);
  expect(observation.sharedState.currentObservation).toBeNull();
  expect(mockReadings.methods.loadReadings).not.toHaveBeenCalled();
});

it('does not overwrite a newer load with an older findOne response', async () => {
  const older = { ...base(), id: 104 };
  const newer = { ...base(), id: 105 };
  const findOlder = deferred<IObservation>();
  jest.mocked(observationService.findOne)
    .mockReturnValueOnce(findOlder.promise)
    .mockResolvedValueOnce(newer);
  const olderLoad = observation.methods.loadObservation(older.id);
  await flushPromises();
  await observation.methods.loadObservation(newer.id);
  findOlder.resolve(older);
  await olderLoad;
  expect(observation.sharedState.currentObservation?.id).toBe(newer.id);
  expect(mockReadings.methods.loadReadings).toHaveBeenCalledTimes(1);
  expect(observation.sharedState.loading).toBe(false);
});

it('ignores hydration after close and guards child loaders during deletion', async () => {
  const target = { ...base(), id: 106 };
  const hydration = deferred<void>();
  mockReadings.methods.loadReadings.mockImplementationOnce(async (_target, shouldApply) => {
    await hydration.promise;
    expect(shouldApply()).toBe(false);
  });
  const load = observation.methods._loadObservation(target);
  await flushPromises();
  setObservationMutationBlocked(target.id, true);
  observation.methods.closeObservation();
  let idle = false;
  const drain = waitForObservationTasks(target.id).then(() => { idle = true; });
  await flushPromises();
  expect(idle).toBe(false);
  hydration.resolve();
  await Promise.all([load, drain]);
  expect(mockProtocol.methods.loadProtocol).not.toHaveBeenCalled();
  expect(observation.sharedState.currentObservation).toBeNull();
});

it('does not apply a late protocol load to another chronicle', async () => {
  const target = { ...base(), id: 107 };
  const newer = { ...base(), id: 108 };
  const hydration = deferred<void>();
  mockProtocol.methods.loadProtocol.mockImplementationOnce(async (_target, shouldApply) => {
    await hydration.promise;
    expect(shouldApply()).toBe(false);
  });
  const load = observation.methods._loadObservation(target);
  await flushPromises();
  await observation.methods._loadObservation(newer);
  hydration.resolve();
  await load;
  expect(observation.sharedState.currentObservation?.id).toBe(newer.id);
  expect(observation.sharedState.loading).toBe(false);
});

it('does not merge or reload an update response after deletion', async () => {
  const target = { ...base(), id: 109 };
  observation.sharedState.currentObservation = target;
  const update = deferred<IObservation>();
  jest.mocked(observationService.update).mockReturnValueOnce(update.promise);
  const saving = observation.methods.updateObservation(target.id, { name: 'Changed' });
  markObservationDeleted(target.id);
  observation.methods.closeObservation();
  update.resolve({ ...target, name: 'Changed' });
  await saving;
  expect(observation.sharedState.currentObservation).toBeNull();
  expect(observationService.findOne).not.toHaveBeenCalled();
});

it('does not bring back an edited chronicle after the user opened another one', async () => {
  const target = { ...base(), id: 110 };
  const newer = { ...base(), id: 111 };
  observation.sharedState.currentObservation = target;
  const update = deferred<IObservation>();
  jest.mocked(observationService.update).mockReturnValueOnce(update.promise);
  const saving = observation.methods.updateObservation(target.id, { name: 'Changed' });
  await observation.methods._loadObservation(newer);
  update.resolve({ ...target, name: 'Changed' });
  await saving;
  expect(observation.sharedState.currentObservation?.id).toBe(newer.id);
  expect(observationService.findOne).not.toHaveBeenCalled();
});

it('preserves the open model and the newer loader when an old findOne fails', async () => {
  const current = { ...base(), id: 112 };
  observation.sharedState.currentObservation = current;
  const failed = deferred<IObservation>();
  const pending = deferred<IObservation>();
  jest.mocked(observationService.findOne)
    .mockReturnValueOnce(failed.promise)
    .mockReturnValueOnce(pending.promise);
  const first = observation.methods.loadObservation(113);
  const second = observation.methods.loadObservation(114);
  failed.reject(new Error('Offline'));
  await expect(first).rejects.toThrow('Offline');
  expect(observation.sharedState.currentObservation?.id).toBe(current.id);
  expect(observation.sharedState.loading).toBe(true);
  pending.resolve({ ...base(), id: 114 });
  await second;
  expect(observation.sharedState.loading).toBe(false);
});

it('blocks stale timer callbacks while deletion is in progress', () => {
  const target = { ...base(), id: 115 };
  observation.sharedState.currentObservation = target;
  setObservationMutationBlocked(target.id, true);
  observation.timerMethods.startTimer();
  observation.timerMethods.pauseTimer();
  observation.timerMethods.stopTimer();
  expect(observation.sharedState.isPlaying).toBe(false);
  expect(mockReadings.methods.addStartReading).not.toHaveBeenCalled();
  expect(mockReadings.methods.addPauseStartReading).not.toHaveBeenCalled();
  expect(mockReadings.methods.addStopReading).not.toHaveBeenCalled();
});

it('guards the real protocol loader before publishing a late response', async () => {
  const { useProtocol: actualUseProtocol } = jest.requireActual<
    typeof import('../composables/use-observation/use-protocol')
  >('../composables/use-observation/use-protocol');
  const current = reactive({ currentObservation: { ...base(), id: 116 } });
  const actualProtocol = actualUseProtocol({ sharedStateFromObservation: current });
  const currentProtocol = { id: 200, name: 'Current', _items: [] } as unknown as IProtocol;
  actualProtocol.sharedState.currentProtocol = currentProtocol;
  const find = deferred<IProtocol>();
  jest.mocked(protocolService.findOneFromObservationId).mockReturnValueOnce(find.promise);
  const load = actualProtocol.methods.loadProtocol(current.currentObservation);
  setObservationMutationBlocked(current.currentObservation.id, true);
  find.resolve({ id: 201, name: 'Late', _items: [] } as unknown as IProtocol);
  await load;
  expect(actualProtocol.sharedState.currentProtocol?.id).toBe(currentProtocol.id);
  actualProtocol.sharedState.currentProtocol = null;
});
