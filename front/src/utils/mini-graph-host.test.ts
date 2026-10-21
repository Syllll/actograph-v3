/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import MiniGraphHost from '../components/mini-graph/MiniGraphHost.vue';
import { useMiniGraph } from '../composables/use-mini-graph';

jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('quasar', () => ({ useQuasar: () => ({ notify: jest.fn() }) }));
jest.mock('src/utils/mini-graph-window', () => ({ openMiniGraphWindow: jest.fn((options) => {
  mockWindowOptions = options; return { close: mockClose, publish: mockPublish };
}) }));
const mockClose = jest.fn(), mockPublish = jest.fn();
let mockWindowOptions: { onDetached: () => void; onAttached: () => void };
const initialState = () => ({
  sharedState: { loading: false, currentObservation: { id: 1, name: 'A', type: 'normal', meta: {} } as { id: number; name: string; type: string; meta: object } | null,
    currentDate: null, startTime: null },
  protocol: { sharedState: { currentProtocol: { name: 'P', _items: [] } } },
  readings: { sharedState: { currentReadings: [{ name: 'Begin', type: 'start', dateTime: new Date(100000) }], selectedReading: null as { dateTime: Date } | null } },
});
const mockObservation = reactive(initialState());
let mounts = 0, unmounts = 0;
const viewer = { name: 'MiniGraphViewer', template: '<div data-viewer />', props: ['observation', 'selectedTime'],
  mounted() { mounts++; }, unmounted() { unmounts++; }, methods: { fit() {} } };
const wrappers: VueWrapper[] = [];
const open = async () => {
  const wrapper = mount(MiniGraphHost, { props: { active: true }, global: { mocks: { $t: (key: string) => key }, stubs: {
    Teleport: true, MiniGraphViewer: viewer, QBtn: { template: '<button><slot /></button>' }, QIcon: true, QTooltip: true,
  } } });
  wrappers.push(wrapper); useMiniGraph().requested.value = true; await nextTick(); return wrapper;
};
beforeEach(() => {
  jest.useFakeTimers(); Object.assign(mockObservation, initialState()); useMiniGraph().requested.value = false;
  mounts = unmounts = 0; mockClose.mockClear(); mockPublish.mockClear();
});
afterEach(() => { for (const w of wrappers.splice(0)) w.unmount(); jest.useRealTimers(); });

it('destroys the viewer and timers outside Observation and recreates once on return', async () => {
  const w = await open(); expect(mounts).toBe(1); expect(jest.getTimerCount()).toBe(1);
  for (let i = 0; i < 5; i++) {
    await w.setProps({ active: false }); expect(w.find('[data-viewer]').exists()).toBe(false); expect(jest.getTimerCount()).toBe(0);
    await w.setProps({ active: true }); expect(w.find('[data-viewer]').exists()).toBe(true); expect(jest.getTimerCount()).toBe(1);
  }
  expect(mounts).toBe(6); expect(unmounts).toBe(5);
});

it('clears intent and graph immediately when loading starts, including the same id', async () => {
  const w = await open(); mockObservation.sharedState.loading = true;
  expect(useMiniGraph().requested.value).toBe(false); await nextTick();
  expect(w.find('[data-viewer]').exists()).toBe(false); expect(jest.getTimerCount()).toBe(0);
  mockObservation.sharedState.loading = false; await nextTick(); expect(mounts).toBe(1);
});

it('resets even when another chronicle is loaded while outside Observation', async () => {
  const w = await open(); await w.setProps({ active: false });
  mockObservation.sharedState.currentObservation = { id: 2, name: 'B', type: 'normal', meta: {} };
  await w.setProps({ active: true }); expect(useMiniGraph().requested.value).toBe(false); expect(mounts).toBe(1);
});

it('tears down a detached graph on tab change and restores a local viewer on return', async () => {
  const w = await open(); w.vm.detach(); mockWindowOptions.onDetached(); await nextTick();
  expect(w.find('[data-viewer]').exists()).toBe(false);
  await w.setProps({ active: false }); expect(mockClose).toHaveBeenCalledTimes(1);
  await w.setProps({ active: true }); expect(w.find('[data-viewer]').exists()).toBe(true);
});

it('closing a chronicle clears its snapshot and detached window', async () => {
  const w = await open(); w.vm.detach(); mockWindowOptions.onDetached();
  mockObservation.sharedState.currentObservation = null; await nextTick();
  expect(mockClose).toHaveBeenCalledTimes(1); expect(w.vm.snapshot).toBeNull(); expect(useMiniGraph().requested.value).toBe(false);
});

it('selection changes update only the marker and preserve the data reference', async () => {
  const w = await open(); const previous = w.vm.snapshot!.observation;
  mockObservation.readings.sharedState.selectedReading = { dateTime: new Date(100000) }; await nextTick();
  expect(w.vm.snapshot!.observation).toBe(previous); expect(w.vm.snapshot!.selectedTime).toBe(100000);
  mockObservation.readings.sharedState.selectedReading = null; await nextTick(); expect(w.vm.snapshot!.selectedTime).toBeNull();
});

it('releases listeners and timers when its shell unmounts', async () => {
  const w = await open(); w.vm.detach(); const remove = jest.spyOn(window, 'removeEventListener'); w.unmount(); wrappers.pop();
  expect(jest.getTimerCount()).toBe(0); expect(mockClose).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function)); remove.mockRestore();
});
