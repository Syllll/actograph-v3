import { reactive, ref } from 'vue';

// A deletion keeps the live model intact until the API succeeds. Existing
// requests finish first; new writes/autosaves must not race the DELETE.
export const deletingObservationIds = reactive(new Set<number>());
export const observationDeletionRevision = ref(0);
const deletedIds = new Set<number>();
const pendingTasks = new Map<number, Set<Promise<unknown>>>();

export function isObservationDeleted(id: number): boolean {
  return deletedIds.has(id);
}

export function isObservationMutationBlocked(id: number | null | undefined): boolean {
  return id != null && (deletingObservationIds.has(id) || deletedIds.has(id));
}

export function setObservationMutationBlocked(id: number, blocked: boolean): void {
  if (blocked) deletingObservationIds.add(id);
  else deletingObservationIds.delete(id);
}

export function markObservationDeleted(id: number): void {
  deletedIds.add(id);
  observationDeletionRevision.value += 1;
}

export async function trackObservationTask<T>(id: number, task: () => Promise<T>): Promise<T> {
  if (isObservationMutationBlocked(id)) throw new Error('Observation is being deleted');
  const promise = Promise.resolve().then(task);
  const tasks = pendingTasks.get(id) ?? new Set<Promise<unknown>>();
  tasks.add(promise);
  pendingTasks.set(id, tasks);
  try {
    return await promise;
  } finally {
    tasks.delete(promise);
    if (tasks.size === 0) pendingTasks.delete(id);
  }
}

export async function waitForObservationTasks(id: number): Promise<void> {
  while (pendingTasks.get(id)?.size) {
    await Promise.allSettled([...pendingTasks.get(id)!]);
  }
}
