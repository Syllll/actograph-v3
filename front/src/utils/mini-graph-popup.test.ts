/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import MiniGraphPopup from '../components/mini-graph/MiniGraphPopup.vue';
import type { MiniGraphMessage } from './mini-graph-window';
import type { MiniGraphSnapshot } from './mini-graph-data';
jest.mock('vue-router', () => ({ useRoute: () => ({ query: { session: 'd578f272-aaaa-4000-8000-39c920bb8021' } }) }));
class MockChannel {
  static current: MockChannel;
  onmessage: ((event: { data: MiniGraphMessage }) => void) | null = null;
  postMessage = jest.fn(); close = jest.fn();
  constructor() { MockChannel.current = this; }
}
const snapshot = (id = 1, dataVersion = 1): MiniGraphSnapshot => ({
  observation: { id, name: `Chronicle ${id}`, protocol: { name: 'P', items: [] }, readings: [] },
  selectedTime: null, dataVersion,
} as unknown as MiniGraphSnapshot);
let wrapper: VueWrapper<InstanceType<typeof MiniGraphPopup>>;
const send = (data: MiniGraphMessage) => MockChannel.current.onmessage!({ data });
beforeEach(() => {
  jest.useFakeTimers(); Object.defineProperty(window, 'BroadcastChannel', { configurable: true, value: MockChannel });
  jest.spyOn(window, 'close').mockImplementation(() => undefined);
  wrapper = mount(MiniGraphPopup, { global: { mocks: { $t: (key: string) => key }, stubs: {
    MiniGraphViewer: { template: '<div data-viewer />', props: ['observation', 'selectedTime'] },
    QBtn: true, QSpinner: true, QSpace: true,
  } } });
});
afterEach(() => { wrapper.unmount(); jest.restoreAllMocks(); jest.useRealTimers(); });
it('requests a live snapshot and rejects old revisions or a different chronicle', async () => {
  expect(MockChannel.current.postMessage).toHaveBeenCalledWith({ type: 'ready' });
  send({ type: 'snapshot', revision: 2, snapshot: snapshot() }); await nextTick();
  const current = wrapper.vm.snapshot;
  send({ type: 'snapshot', revision: 1, snapshot: snapshot(1, 2) });
  send({ type: 'snapshot', revision: 3, snapshot: snapshot(2, 3) });
  expect(wrapper.vm.snapshot).toBe(current); expect(wrapper.find('[data-viewer]').exists()).toBe(true);
});
it('keeps the data reference when only the selected reading changed', () => {
  send({ type: 'snapshot', revision: 1, snapshot: snapshot() }); const previous = wrapper.vm.snapshot!.observation;
  send({ type: 'snapshot', revision: 2, snapshot: { ...snapshot(), selectedTime: 123 } });
  expect(wrapper.vm.snapshot!.observation).toBe(previous); expect(wrapper.vm.snapshot!.selectedTime).toBe(123);
});
it('destroys the viewer and closes itself on owner disposal', async () => {
  send({ type: 'snapshot', revision: 1, snapshot: snapshot() }); await nextTick();
  send({ type: 'close' }); await nextTick();
  expect(wrapper.find('[data-viewer]').exists()).toBe(false); expect(jest.getTimerCount()).toBe(0);
  expect(MockChannel.current.close).toHaveBeenCalledTimes(1); expect(window.close).toHaveBeenCalledTimes(1);
});
it('disposes an orphan and ignores a late snapshot after expiry', async () => {
  const receive = MockChannel.current.onmessage!;
  send({ type: 'snapshot', revision: 1, snapshot: snapshot() }); await nextTick(); jest.advanceTimersByTime(9000);
  receive({ data: { type: 'snapshot', revision: 2, snapshot: snapshot() } }); await nextTick();
  expect(wrapper.vm.snapshot).toBeNull(); expect(jest.getTimerCount()).toBe(0); expect(window.close).toHaveBeenCalledTimes(1);
});
