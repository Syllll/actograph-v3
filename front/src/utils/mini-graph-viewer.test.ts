/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount, flushPromises } from '@vue/test-utils';
import type { IObservation } from '@actograph/core';
import MiniGraphViewer from '../components/mini-graph/MiniGraphViewer.vue';
jest.mock('@actograph/graph', () => ({ PixiApp: class {
  init = mockInit; destroy = mockDestroy; setData = jest.fn(); setSelectedReadingTime = jest.fn();
  setGraphRenderOptions = jest.fn(); setAxisStretch = jest.fn().mockResolvedValue(undefined);
  resizeFromCanvas = jest.fn(); draw = jest.fn().mockResolvedValue(undefined);
  settleInitialLayoutFit = jest.fn().mockResolvedValue(undefined);
} }));
const mockInit = jest.fn().mockResolvedValue(undefined), mockDestroy = jest.fn();
const disconnect = jest.fn();
const observation = (data = false) => ({ name: 'Empty', type: 'normal', protocol: { name: 'P', items: [] },
  readings: data ? [{ name: 'Activity', type: 'data', dateTime: new Date() }] : [] } as unknown as IObservation);
beforeEach(() => {
  mockInit.mockClear(); mockDestroy.mockClear(); disconnect.mockClear();
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: class { observe() {} disconnect = disconnect; } });
});
it('shows an empty state without allocating Pixi, initializes on first data and frees it when emptied', async () => {
  const wrapper = mount(MiniGraphViewer, { props: { observation: observation() }, global: {
    mocks: { $t: (key: string) => key }, stubs: { QIcon: true, QBtn: true, QSpinner: true },
  } });
  await flushPromises(); expect(mockInit).not.toHaveBeenCalled(); expect(wrapper.text()).toContain('miniGraph.empty');
  await wrapper.setProps({ observation: observation(true) }); await flushPromises(); expect(mockInit).toHaveBeenCalledTimes(1);
  await wrapper.setProps({ observation: observation() }); await flushPromises(); expect(mockDestroy).toHaveBeenCalledTimes(1);
  wrapper.unmount(); expect(disconnect).toHaveBeenCalledTimes(1);
});
