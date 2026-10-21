/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive, ref } from 'vue';
import { ReadingTypeEnum } from '@services/observations/interface';
import ObservationSessionBar from './ObservationSessionBar.vue';
import ButtonsSide from './buttons-side/Index.vue';

const mockRecPause = jest.fn();
const mockTerminate = jest.fn();
const mockNotify = jest.fn();
jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('quasar', () => ({ ...jest.requireActual('quasar'), useQuasar: () => ({ notify: mockNotify }) }));
jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('@services/observations/index.service', () => ({ observationService: {} }));
jest.mock('@services/observations/protocol.service', () => ({
  ProtocolItemTypeEnum: { Category: 'category', Observable: 'observable' },
  ProtocolItemActionEnum: { Continuous: 'continuous', Discrete: 'discrete' },
}));
jest.mock('./observation-session-actions', () => ({
  handleRecPauseClick: () => mockRecPause(), confirmAndCompleteObservationStop: () => mockTerminate(),
  isProtocolMissing: () => false, hasAnyStopReading: () => false, isSessionStarted: () => false,
}));
jest.mock('./ModeToggle.vue', () => ({ name: 'ModeToggle', render: () => null }));
jest.mock('./ImportProtocolDialog.vue', () => ({ render: () => null }));
jest.mock('@lib-improba/utils/dialog.utils', () => ({ createDialog: jest.fn() }));
jest.mock('@lib-improba/components/app/scroll-areas', () => ({
  DScrollArea: defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) }),
}));
jest.mock('./buttons-side/Category.vue', () => ({ name: 'Category', render: () => null }));

const makeObservation = (manual = true, mode = 'calendar') => {
  const readingsState = reactive({ currentReadings: [] as any[], selectedReading: null as any });
  return {
    sharedState: reactive({ currentObservation: { id: 42, mode, meta: manual ? { entryMode: 'manual' } : {} }, elapsedTime: 0, isPlaying: false, startTime: null as number | null, currentDate: null }),
    isChronometerMode: ref(mode === 'chronometer'),
    protocol: {
      sharedState: reactive({ currentProtocol: { id: 12, _items: [{ id: 'category', type: 'category', action: 'continuous', children: [{ id: 'observable', name: 'Lecture', description: 'Notes' }] }] } }),
      methods: { loadProtocol: jest.fn() },
    },
    timerMethods: { formatDuration: jest.fn(() => '00:00') },
    readings: {
      sharedState: readingsState,
      methods: {
        selectReading: jest.fn(), addReading: jest.fn(), updateReading: jest.fn(),
        addManualReading: jest.fn(() => {
          const row = { tempId: 'new', type: ReadingTypeEnum.DATA, name: 'Old', dateTime: new Date('2026-01-01T10:00:00.000Z') };
          readingsState.selectedReading = row;
          return row;
        }),
      },
    },
  };
};
let mockObservation: ReturnType<typeof makeObservation>;
const wrappers: VueWrapper[] = [];
const slotStub = { template: '<div><slot /></div>' };
const global = {
  mocks: { $t: (key: string) => key },
  stubs: { QBtn: slotStub, QIcon: slotStub, QTooltip: true, QSpace: true, QSeparator: true, RouterLink: slotStub },
};
const mountComponent = (component: any) => {
  const wrapper = mount(component, { global });
  wrappers.push(wrapper);
  return wrapper;
};
beforeEach(() => { Object.defineProperty(window, 'CSS', { configurable: true, value: { escape: (value: string) => value } }); jest.clearAllMocks(); mockObservation = makeObservation(); });
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); });

describe('manual entry session interface', () => {
  it.each(['calendar', 'chronometer'])('hides live controls, clock and mode switch for manual %s entries', async (mode) => {
    mockObservation = makeObservation(true, mode);
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const wrapper = mountComponent(ObservationSessionBar);
    expect(wrapper.find('[role="status"]').text()).toContain('observation.manualEntryLabel');
    expect(wrapper.find('.timer-chip-wrapper').exists()).toBe(false);
    expect(wrapper.find('.observation-toolbar-host').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'ModeToggle' }).exists()).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    await (wrapper.vm as any).methods.onRecPauseClick();
    await (wrapper.vm as any).methods.onTerminerClick();
    expect(mockRecPause).not.toHaveBeenCalled();
    expect(mockTerminate).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('retains the live toolbar for observations without manual metadata', () => {
    mockObservation = makeObservation(false);
    const wrapper = mountComponent(ObservationSessionBar);
    expect(wrapper.find('.timer-chip-wrapper').exists()).toBe(true);
    expect(wrapper.findAll('.observation-toolbar-host')).toHaveLength(1);
    (wrapper.vm as any).methods.onRecPauseClick();
    expect(mockRecPause).toHaveBeenCalledTimes(1);
  });

  it.each(['calendar', 'chronometer'])('adds a category reading manually without START, REC or wall clock time in %s', async (mode) => {
    mockObservation = makeObservation(true, mode);
    const wrapper = mountComponent(ButtonsSide);
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.methods.handleSwitchClick({ categoryId: 'category', observableId: 'observable' });
    vm.methods.handleSwitchClick({ categoryId: 'category', observableId: 'observable' });
    expect(mockObservation.readings.methods.addManualReading).toHaveBeenCalledTimes(2);
    expect(mockObservation.readings.methods.updateReading).toHaveBeenCalledWith(expect.objectContaining({ tempId: 'new' }), { name: 'Lecture', description: 'Notes', type: ReadingTypeEnum.DATA });
    expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockObservation.sharedState.isPlaying).toBe(false);
  });

  it('does not lock manual category buttons or auto-create readings from historical START markers', async () => {
    mockObservation.readings.sharedState.currentReadings = [{ type: ReadingTypeEnum.START, dateTime: new Date('2026-01-01T10:00:00.000Z') }];
    const wrapper = mountComponent(ButtonsSide);
    await flushPromises();
    expect((wrapper.vm as any).computedState.isLockedByCalendarPause.value).toBe(false);
    expect(wrapper.find('.paused-overlay').exists()).toBe(false);
    (wrapper.vm as any).methods.createInitialContinuousReadingsForCurrentStart();
    expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalled();
    expect(mockObservation.readings.methods.selectReading).not.toHaveBeenCalled();
  });
});


describe('current runtime session status', () => {
  it.each([
    [[ReadingTypeEnum.START]],
    [[ReadingTypeEnum.START, ReadingTypeEnum.STOP]],
    [[ReadingTypeEnum.START, ReadingTypeEnum.PAUSE_START]],
  ])('opens historical markers %p with no active session or Terminer control', (types) => {
    mockObservation = makeObservation(false);
    mockObservation.readings.sharedState.currentReadings = types.map((type) => ({ type, dateTime: new Date('2025-01-01T10:00:00Z') }));
    const wrapper = mountComponent(ObservationSessionBar);
    expect(wrapper.text()).toContain('observation.sessionInactive');
    expect(wrapper.find('[aria-label="observation.sessionStart"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="observation.sessionTerminer"]').exists()).toBe(false);
    expect(wrapper.find('.timer-paused-veil').exists()).toBe(false);
    expect(wrapper.find('.observation-toolbar-chip--timer').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').text()).toContain('observation.sessionInactive');
    expect(wrapper.find('[aria-label="observation.timerChipClock"]').exists()).toBe(true);
    (wrapper.vm as unknown as { methods: { onTerminerClick: () => void } }).methods.onTerminerClick();
    expect(mockTerminate).not.toHaveBeenCalled();
  });

  it('shows running, paused and inactive states from runtime, independently of saved markers', async () => {
    mockObservation = makeObservation(false);
    const wrapper = mountComponent(ObservationSessionBar);
    Object.assign(mockObservation.sharedState, { startTime: Date.now(), isPlaying: true });
    await flushPromises();
    expect(wrapper.text()).toContain('observation.sessionActive');
    expect(wrapper.find('[aria-label="observation.sessionTerminer"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="observation.sessionPause"]').exists()).toBe(true);
    mockObservation.sharedState.isPlaying = false;
    await flushPromises();
    expect(wrapper.text()).toContain('observation.sessionPaused');
    expect(wrapper.find('[aria-label="observation.sessionResume"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="observation.sessionTerminer"]').exists()).toBe(true);
    expect(wrapper.find('.timer-paused-veil').exists()).toBe(true);
    Object.assign(mockObservation.sharedState, { startTime: null, elapsedTime: 0 });
    await flushPromises();
    expect(wrapper.text()).toContain('observation.sessionInactive');
    expect(wrapper.find('[aria-label="observation.sessionTerminer"]').exists()).toBe(false);
    expect(wrapper.find('.timer-paused-veil').exists()).toBe(false);
  });

  it('does not treat a video seek as an active or paused recording', () => {
    mockObservation = makeObservation(false, 'chronometer');
    mockObservation.sharedState.elapsedTime = 123;
    const wrapper = mountComponent(ObservationSessionBar);
    expect(wrapper.text()).toContain('observation.sessionInactive');
    expect(wrapper.find('[aria-label="observation.sessionTerminer"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="observation.timerChipPaused"]').exists()).toBe(false);
  });
});


describe('session attachment guard', () => {
  it('blocks recording and termination callbacks during attachment even if called directly', async () => {
    mockObservation = makeObservation(false);
    Object.assign(mockObservation.sharedState, { startTime: Date.now(), isPlaying: true });
    const wrapper = mount(ObservationSessionBar, { props: { attachInProgress: true }, global });
    wrappers.push(wrapper);
    const vm = wrapper.vm as unknown as { methods: { onRecPauseClick: () => void; onTerminerClick: () => Promise<void> } };
    vm.methods.onRecPauseClick();
    await vm.methods.onTerminerClick();
    expect(mockRecPause).not.toHaveBeenCalled();
    expect(mockTerminate).not.toHaveBeenCalled();
    await wrapper.setProps({ attachInProgress: false });
    await vm.methods.onTerminerClick();
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });
});


describe('loaded observation board runtime state', () => {
  it.each([
    [[ReadingTypeEnum.START]],
    [[ReadingTypeEnum.START, ReadingTypeEnum.PAUSE_START]],
  ])('does not lock a loaded calendar observation containing historical %p markers', async (types) => {
    mockObservation = makeObservation(false);
    mockObservation.readings.sharedState.currentReadings = types.map((type) => ({ type, dateTime: new Date('2025-01-01T10:00:00Z') }));
    const wrapper = mountComponent(ButtonsSide);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      computedState: { isRecordingStarted: { value: boolean }; isContinuousDisabled: { value: boolean }; isDiscreteDisabled: { value: boolean } };
      methods: { createInitialContinuousReadingsForCurrentStart: () => void };
    };
    expect(vm.computedState.isRecordingStarted.value).toBe(false);
    expect(vm.computedState.isContinuousDisabled.value).toBe(false);
    expect(vm.computedState.isDiscreteDisabled.value).toBe(false);
    expect(wrapper.find('.paused-overlay').exists()).toBe(false);
    vm.methods.createInitialContinuousReadingsForCurrentStart();
    expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalled();
    expect(mockObservation.readings.methods.selectReading).not.toHaveBeenCalled();
  });

  it('requires a runtime start in a loaded chronometer, then permits captures while runtime is paused', async () => {
    mockObservation = makeObservation(false, 'chronometer');
    mockObservation.readings.sharedState.currentReadings = [{ type: ReadingTypeEnum.START, dateTime: new Date('2025-01-01T10:00:00Z') }];
    mockObservation.sharedState.elapsedTime = 123;
    const wrapper = mountComponent(ButtonsSide);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      methods: { recordReading: (categoryId: string, observableId: string, action: string) => void };
    };
    vm.methods.recordReading('category', 'observable', 'continuous');
    expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ message: 'observation.startBeforeRecording' }));
    mockObservation.sharedState.startTime = Date.now();
    await flushPromises();
    vm.methods.recordReading('category', 'observable', 'continuous');
    expect(mockObservation.readings.methods.addReading).toHaveBeenCalledTimes(1);
    expect(mockObservation.readings.methods.addReading).toHaveBeenCalledWith(expect.objectContaining({ observableName: 'Lecture', elapsedTime: 123 }));
    expect(wrapper.find('.paused-overlay').exists()).toBe(false);
  });
});

it('initializes continuous readings at the fresh runtime START after opening an unmatched historical START', async () => {
  mockObservation = makeObservation(false);
  const historicalStart = new Date('2025-01-01T10:00:00.000Z');
  const freshStart = new Date('2026-10-21T12:34:56.789Z');
  mockObservation.readings.sharedState.currentReadings = [{ id: 9, type: ReadingTypeEnum.START, dateTime: historicalStart }];
  const wrapper = mountComponent(ButtonsSide);
  await flushPromises();
  const vm = wrapper.vm as unknown as { methods: { createInitialContinuousReadingsForCurrentStart: () => void } };
  vm.methods.createInitialContinuousReadingsForCurrentStart();
  expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalled();

  // The recording composable appends the fresh START before switching runtime
  // state. Exercise the mounted board watcher and explicit initialization path.
  mockObservation.readings.sharedState.currentReadings.push({ tempId: 'fresh-start', type: ReadingTypeEnum.START, dateTime: freshStart });
  Object.assign(mockObservation.sharedState, { startTime: freshStart.getTime(), isPlaying: true });
  await flushPromises();
  vm.methods.createInitialContinuousReadingsForCurrentStart();
  expect(mockObservation.readings.methods.addReading).toHaveBeenCalledTimes(1);
  expect(mockObservation.readings.methods.addReading).toHaveBeenCalledWith(expect.objectContaining({ observableName: 'Lecture', dateTime: freshStart }));
  expect(mockObservation.readings.methods.addReading).not.toHaveBeenCalledWith(expect.objectContaining({ dateTime: historicalStart }));
});
