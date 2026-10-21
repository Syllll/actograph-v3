/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, type App } from 'vue';
import { Quasar } from 'quasar';
import CreateObservationDialog from './CreateObservationDialog.vue';
import { ObservationModeEnum } from '@services/observations/interface';

const mockDialogOK = jest.fn();
const mockFindObservations = jest.fn();
jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: ref('fr') }) }));
jest.mock('quasar', () => ({
  ...jest.requireActual('quasar'),
  useDialogPluginComponent: Object.assign(() => ({
    dialogRef: ref(null), onDialogHide: jest.fn(), onDialogOK: mockDialogOK, onDialogCancel: jest.fn(),
  }), { emits: ['ok', 'hide'] }),
  useQuasar: () => ({ notify: jest.fn() }),
}));
jest.mock('@lib-improba/components', () => ({
  DDialogCard: defineComponent({ name: 'DDialogCard', setup: (_, { slots }) => () => h('section', slots.default?.()) }),
}));
jest.mock('@services/observations/index.service', () => ({ observationService: { findAllForCurrentUser: () => mockFindObservations() } }));
jest.mock('@services/observations/protocol.service', () => ({ protocolHasAtLeastOneCategory: (protocol: unknown) => Boolean(protocol) }));

let wrapper: VueWrapper;
const vm = () => wrapper.vm as unknown as {
  state: { creationEntry: string; name: string; description: string; manualMode: ObservationModeEnum; protocolChoice: string; sourceObservationId: number | null; videoPath: string | null };
  methods: { isValid: boolean; onOKClick: () => void };
};
const mountDialog = async () => {
  wrapper = mount(CreateObservationDialog, {
    global: { plugins: [{ install: (app: App) => Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, { req: { headers: {} } }]) }], mocks: { $t: (key: string) => key }, stubs: { QDialog: { template: '<div><slot /></div>' } } },
  });
  await flushPromises();
  vm().state.name = '  Notes de la journée  ';
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFindObservations.mockResolvedValue([{ id: 7, name: 'Ancien protocole', protocol: {} }, { id: 8, name: 'Sans protocole' }]);
});
afterEach(() => wrapper?.unmount());

describe('dedicated manual chronicle creation', () => {
  it('offers manual entry with calendar dates and an explicit new protocol choice', async () => {
    await mountDialog();
    const entry = wrapper.findAllComponents({ name: 'QSelect' })[0];
    expect(entry.props('options')).toEqual(expect.arrayContaining([expect.objectContaining({ value: 'manual' })]));
    vm().state.creationEntry = 'manual';
    await flushPromises();
    expect(wrapper.find('[data-testid="manual-time-basis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="manual-protocol-choice"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="protocol-source"]').exists()).toBe(false);
    vm().methods.onOKClick();
    expect(mockDialogOK).toHaveBeenCalledWith({ name: 'Notes de la journée', description: undefined, mode: 'calendar', meta: { entryMode: 'manual' } });
  });

  it('creates a manual relative-time chronicle with an existing protocol', async () => {
    await mountDialog();
    Object.assign(vm().state, { creationEntry: 'manual', manualMode: ObservationModeEnum.Chronometer, protocolChoice: 'copy', sourceObservationId: 7 });
    await flushPromises();
    expect(wrapper.findAllComponents({ name: 'QSelect' })[2].props('options')).toEqual([{ label: 'Ancien protocole', value: 7 }]);
    vm().methods.onOKClick();
    expect(mockDialogOK).toHaveBeenCalledWith(expect.objectContaining({ mode: 'chronometer', sourceObservationId: 7, meta: { entryMode: 'manual' } }));
  });

  it.each([null, 8, 999])('requires a valid available protocol before copying, source %p', async (sourceObservationId) => {
    await mountDialog();
    Object.assign(vm().state, { creationEntry: 'manual', protocolChoice: 'copy', sourceObservationId });
    expect(vm().methods.isValid).toBe(false);
    vm().methods.onOKClick();
    expect(mockDialogOK).not.toHaveBeenCalled();
  });

  it('ignores the previous source when new protocol is chosen', async () => {
    await mountDialog();
    Object.assign(vm().state, { creationEntry: 'manual', protocolChoice: 'new', sourceObservationId: 7 });
    vm().methods.onOKClick();
    expect(mockDialogOK.mock.calls[0][0]).not.toHaveProperty('sourceObservationId');
  });

  it.each([['direct', 'calendar'], ['chronometer', 'chronometer']])('keeps the existing %s creation payload', async (entry, mode) => {
    await mountDialog();
    vm().state.creationEntry = entry;
    vm().methods.onOKClick();
    expect(mockDialogOK).toHaveBeenCalledWith({ name: 'Notes de la journée', description: undefined, mode });
  });

  it('clears video on switching to manual and cannot submit twice', async () => {
    await mountDialog();
    vm().state.creationEntry = 'video';
    vm().state.videoPath = '/tmp/movie.mp4';
    await flushPromises();
    vm().state.creationEntry = 'manual';
    await flushPromises();
    expect(vm().state.videoPath).toBe(null);
    vm().methods.onOKClick();
    vm().methods.onOKClick();
    expect(mockDialogOK).toHaveBeenCalledTimes(1);
    expect(mockDialogOK.mock.calls[0][0]).not.toHaveProperty('videoPath');
  });
});
