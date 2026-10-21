/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { mount } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import ObservationPage from '../Index.vue';

jest.mock('src/composables/use-observation', () => ({ useObservation: () => ({
  sharedState: reactive({ currentObservation: { id: 1, meta: { entryMode: 'manual' } } }),
  isChronometerMode: ref(false),
}) }));
jest.mock('src/composables/use-popout', () => ({ usePopout: () => ({ sharedState: reactive({ buttons: false, video: false }) }) }));
jest.mock('./buttons-side/Index.vue', () => ({ render: () => null }));
jest.mock('./readings-side/Index.vue', () => ({ name: 'ReadingsSide', render: () => null }));
jest.mock('./CalendarToolbar.vue', () => ({ render: () => null }));
jest.mock('./VideoPlayer.vue', () => ({ render: () => null }));

it('allows widening beyond content width and updates limits when the window resizes', async () => {
  let width = 1200;
  const size = jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  let resized!: ResizeObserverCallback;
  const previous = global.ResizeObserver;
  global.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { resized = callback; }
    observe() {} unobserve() {} disconnect() {}
  } as typeof ResizeObserver;
  const wrapper = mount(ObservationPage, { global: { mocks: { $t: (key: string) => key }, stubs: {
    QBtn: true, QIcon: true, QTooltip: true, QAvatar: true,
    DPage: { template: '<div><slot /></div>' },
    QSplitter: { template: '<div><slot name="before" /><slot name="after" /></div>' },
  } } });
  try {
    await nextTick();
    wrapper.vm.onReadingsContentWidth(350);
    expect(wrapper.vm.readingsSplitterLimits).toEqual([240, 1000]);
    wrapper.vm.state.splitterModel = 800;
    wrapper.vm.onReadingsContentWidth(360);
    expect(wrapper.vm.state.splitterModel).toBe(800);
    width = 700;
    resized([], {} as ResizeObserver);
    await nextTick();
    expect(wrapper.vm.readingsSplitterLimits).toEqual([240, 500]);
    expect(wrapper.vm.state.splitterModel).toBe(500);
  } finally {
    wrapper.unmount(); size.mockRestore(); global.ResizeObserver = previous;
  }
});
