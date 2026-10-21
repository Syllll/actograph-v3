/** @jest-environment jsdom */
import { nextTick, reactive } from 'vue';
import { useObservation } from '../composables/use-observation';
import { observationService } from '../services/observations/index.service';
import { IObservation, IReading, ObservationModeEnum, ReadingTypeEnum } from '../services/observations/interface';

jest.mock('../composables/use-observation/use-readings', () => ({ useReadings: () => mockReadings }));
jest.mock('../composables/use-observation/use-protocol', () => ({ useProtocol: () => mockProtocol }));
jest.mock('../services/observations/index.service', () => ({ observationService: { findOne: jest.fn(), create: jest.fn() } }));
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
