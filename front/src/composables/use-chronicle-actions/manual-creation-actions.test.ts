/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { useChronicleActions } from './index';

const mockCreateDialog = jest.fn();
const mockCreateObservation = jest.fn();
const mockCloneProtocol = jest.fn();
const mockLoadProtocol = jest.fn();
const mockRouterPush = jest.fn();
const mockNotify = jest.fn();
const mockObservation = {
  sharedState: { currentObservation: { id: 55 } },
  methods: { createObservation: mockCreateObservation },
  protocol: { methods: { loadProtocol: mockLoadProtocol } },
};
jest.mock('quasar', () => ({ useQuasar: () => ({ notify: mockNotify }) }));
jest.mock('vue-router', () => ({ useRouter: () => ({ push: mockRouterPush }) }));
jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('src/composables/use-cloud', () => ({ useCloud: () => ({}) }));
jest.mock('@lib-improba/utils/dialog.utils', () => ({ createDialog: () => mockCreateDialog() }));
jest.mock('@services/observations/export.service', () => ({ exportService: {} }));
jest.mock('@services/observations/import.service', () => ({ importService: {} }));
jest.mock('@services/observations/protocol.service', () => ({ protocolService: { cloneProtocol: (...args: unknown[]) => mockCloneProtocol(...args) } }));
jest.mock('@pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/active-chronicle/SaveAsDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/my-observations/MergeObservationsDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/cloud/CloudLoginDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/cloud/CloudSyncDialog.vue', () => ({}));

beforeEach(() => { jest.clearAllMocks(); });

describe('manual creation navigation and payload', () => {
  it('persists manual metadata and opens the protocol editor for a new protocol', async () => {
    mockCreateDialog.mockResolvedValue({ name: 'Notes', mode: 'calendar', meta: { entryMode: 'manual' } });
    await useChronicleActions().createObservation();
    expect(mockCreateObservation).toHaveBeenCalledWith({ name: 'Notes', description: undefined, mode: 'calendar', meta: { entryMode: 'manual' } });
    expect(mockCloneProtocol).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'user_protocol' });
  });

  it('copies the chosen protocol, reloads it and opens manual observation', async () => {
    mockCreateDialog.mockResolvedValue({ name: 'Notes', mode: 'chronometer', sourceObservationId: 12, meta: { entryMode: 'manual' } });
    await useChronicleActions().createObservation();
    expect(mockCloneProtocol).toHaveBeenCalledWith(12, 55);
    expect(mockLoadProtocol).toHaveBeenCalledWith(mockObservation.sharedState.currentObservation);
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'user_observation' });
    expect(mockCreateObservation.mock.invocationCallOrder[0]).toBeLessThan(mockCloneProtocol.mock.invocationCallOrder[0]);
    expect(mockCloneProtocol.mock.invocationCallOrder[0]).toBeLessThan(mockRouterPush.mock.invocationCallOrder[0]);
  });

  it('preserves the live creation destination', async () => {
    mockCreateDialog.mockResolvedValue({ name: 'Direct', mode: 'calendar' });
    await useChronicleActions().createObservation();
    expect(mockCreateObservation.mock.calls[0][0]).not.toHaveProperty('meta');
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'user_observation' });
  });

  it('has no side effects when cancelled', async () => {
    mockCreateDialog.mockResolvedValue(false);
    await useChronicleActions().createObservation();
    expect(mockCreateObservation).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
