/** @jest-environment jsdom */
import { useChronicleActions } from './index';
import { deletingObservationIds, isObservationMutationBlocked, trackObservationTask } from 'src/utils/observation-mutation-guard';

const mockDelete = jest.fn();
const mockPush = jest.fn();
const mockNotify = jest.fn();
const mockReadingIdle = jest.fn();
const mockMetaIdle = jest.fn();
const mockRequestClose = jest.fn();
const mockMiniGraph = { requested: { value: true } };
let mockConfirmed = true;
let nextId = 700;
const mockObservation = {
  sharedState: { currentObservation: { id: 700, name: 'Essai' } as { id: number; name: string } | null, loading: false, isPlaying: false, startTime: null as number | null },
  methods: { closeObservation: jest.fn() },
};
jest.mock('quasar', () => ({ useQuasar: () => ({
  notify: mockNotify,
  dialog: () => {
    const chain = {
      onOk(callback: () => void) { if (mockConfirmed) callback(); return chain; },
      onDismiss(callback: () => void) { if (!mockConfirmed) callback(); return chain; },
    };
    return chain;
  },
}) }));
jest.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('src/composables/use-observation', () => ({ useObservation: () => mockObservation }));
jest.mock('src/composables/use-observation/use-readings', () => ({ waitForPendingReadingSynchronization: () => mockReadingIdle() }));
jest.mock('src/utils/observation-meta-update', () => ({ observationGraphMetaPersistQueue: { whenIdle: (id: number) => mockMetaIdle(id) } }));
jest.mock('src/composables/use-popout', () => ({ usePopout: () => ({ requestClose: mockRequestClose }) }));
jest.mock('src/composables/use-mini-graph', () => ({ useMiniGraph: () => mockMiniGraph }));
jest.mock('src/composables/use-cloud', () => ({ useCloud: () => ({}) }));
jest.mock('@lib-improba/utils/dialog.utils', () => ({ createDialog: jest.fn() }));
jest.mock('@services/observations/index.service', () => ({ observationService: { delete: (id: number) => mockDelete(id) } }));
jest.mock('@services/observations/export.service', () => ({ exportService: {} }));
jest.mock('@services/observations/import.service', () => ({ importService: {} }));
jest.mock('@services/observations/protocol.service', () => ({ protocolService: {} }));
jest.mock('@pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/active-chronicle/SaveAsDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/my-observations/MergeObservationsDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/cloud/CloudLoginDialog.vue', () => ({}));
jest.mock('@pages/userspace/home/_components/cloud/CloudSyncDialog.vue', () => ({}));

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmed = true;
  deletingObservationIds.clear();
  mockObservation.sharedState.currentObservation = { id: ++nextId, name: 'Essai' };
  mockObservation.sharedState.loading = false;
  mockObservation.sharedState.isPlaying = false;
  mockObservation.sharedState.startTime = null;
  mockMiniGraph.requested.value = true;
  mockDelete.mockResolvedValue(undefined);
  mockPush.mockResolvedValue(undefined);
  mockReadingIdle.mockResolvedValue(undefined);
  mockMetaIdle.mockResolvedValue(undefined);
  mockObservation.methods.closeObservation.mockImplementation(() => { mockObservation.sharedState.currentObservation = null; mockObservation.sharedState.loading = false; });
});

it('cancels without closing the current chronicle or touching the API', async () => {
  mockConfirmed = false;
  const target = mockObservation.sharedState.currentObservation!;
  expect(await useChronicleActions().deleteObservation(target)).toBe(false);
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockRequestClose).not.toHaveBeenCalled();
  expect(mockObservation.sharedState.currentObservation).toBe(target);
});

it('deletes a closed chronicle without closing a different active chronicle', async () => {
  const current = mockObservation.sharedState.currentObservation;
  const id = ++nextId;
  expect(await useChronicleActions().deleteObservation({ id, name: 'Ancien essai' })).toBe(true);
  expect(mockDelete).toHaveBeenCalledWith(id);
  expect(mockObservation.sharedState.currentObservation).toBe(current);
  expect(mockObservation.methods.closeObservation).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it('drains reading synchronization and metadata writes before deleting the active model', async () => {
  const target = mockObservation.sharedState.currentObservation!;
  const readings = deferred();
  const metadata = deferred();
  const request = deferred();
  mockReadingIdle.mockReturnValueOnce(readings.promise);
  mockMetaIdle.mockReturnValueOnce(metadata.promise);
  mockDelete.mockReturnValueOnce(request.promise);
  const deletion = useChronicleActions().deleteObservation(target);
  await tick();
  expect(isObservationMutationBlocked(target.id)).toBe(true);
  expect(mockObservation.sharedState.loading).toBe(true);
  expect(mockRequestClose.mock.calls).toEqual([['buttons'], ['video']]);
  expect(mockMiniGraph.requested.value).toBe(false);
  expect(mockDelete).not.toHaveBeenCalled();
  readings.resolve();
  await tick();
  expect(mockMetaIdle).toHaveBeenCalledWith(target.id);
  expect(mockDelete).not.toHaveBeenCalled();
  metadata.resolve();
  await tick();
  expect(mockDelete).toHaveBeenCalledWith(target.id);
  expect(mockObservation.sharedState.currentObservation).toBe(target);
  request.resolve();
  expect(await deletion).toBe(true);
  expect(mockObservation.methods.closeObservation).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith({ name: 'user_home' });
  expect(deletingObservationIds.has(target.id)).toBe(false);
  expect(isObservationMutationBlocked(target.id)).toBe(true);
});

it('waits for an autosave or direct update already in flight', async () => {
  const target = mockObservation.sharedState.currentObservation!;
  const gate = deferred();
  const write = trackObservationTask(target.id, () => gate.promise);
  const deletion = useChronicleActions().deleteObservation(target);
  await tick();
  expect(mockDelete).not.toHaveBeenCalled();
  await expect(trackObservationTask(target.id, async () => undefined)).rejects.toThrow();
  gate.resolve();
  await write;
  expect(await deletion).toBe(true);
});

it('keeps the live model and unlocks writes when deletion fails', async () => {
  const target = mockObservation.sharedState.currentObservation!;
  mockDelete.mockRejectedValueOnce(new Error('Offline'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(await useChronicleActions().deleteObservation(target)).toBe(false);
  expect(mockObservation.sharedState.currentObservation).toBe(target);
  expect(mockObservation.sharedState.loading).toBe(false);
  expect(isObservationMutationBlocked(target.id)).toBe(false);
  expect(mockNotify).toHaveBeenCalledWith({ type: 'negative', message: 'chronicleActions.deleteError' });
  log.mockRestore();
});

it.each(['recording', 'paused'])('refuses deletion during an actual %s session', async (state) => {
  const target = mockObservation.sharedState.currentObservation!;
  mockObservation.sharedState.isPlaying = state === 'recording';
  mockObservation.sharedState.startTime = 123;
  expect(await useChronicleActions().deleteObservation(target)).toBe(false);
  expect(mockDelete).not.toHaveBeenCalled();
});

it('does not close a newly selected chronicle after a late DELETE response', async () => {
  const target = mockObservation.sharedState.currentObservation!;
  const gate = deferred();
  mockDelete.mockReturnValueOnce(gate.promise);
  const deletion = useChronicleActions().deleteObservation(target);
  await tick();
  mockObservation.sharedState.currentObservation = { id: ++nextId, name: 'Nouvelle' };
  gate.resolve();
  expect(await deletion).toBe(true);
  expect(mockObservation.methods.closeObservation).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
