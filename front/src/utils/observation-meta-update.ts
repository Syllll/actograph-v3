/**
 * Applies a persisted meta payload only if the currently opened chronicle
 * is still the one that was saved. Stale responses after a chronicle switch
 * must not overwrite the new observation.
 */
export function mergeMetaIfSameObservation<T extends { id?: string | number; meta?: unknown }>(
  current: T | null | undefined,
  requestedId: string | number,
  meta: T['meta'] | null | undefined,
): T | null {
  if (!meta || current?.id == null || String(current.id) !== String(requestedId)) {
    return null;
  }
  return {
    ...current,
    meta,
  };
}

export type ObservationMetaPatch = Record<string, unknown>;

type PersistBucket = {
  chain: Promise<void>;
  pending: ObservationMetaPatch | null;
};

/**
 * Per-chronicle persist queue. Patches for the same observation are merged and
 * serialized. Switching chronicle does not drop another observation's pending
 * save. Callers should skip applying a response while hasPending(id) is true
 * so an in-flight format save cannot overwrite a newer stretch (or the reverse).
 */
export function createObservationMetaPersistQueue() {
  const buckets = new Map<string, PersistBucket>();

  const bucketKey = (observationId: string | number): string => String(observationId);

  const getBucket = (observationId: string | number): PersistBucket => {
    const key = bucketKey(observationId);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { chain: Promise.resolve(), pending: null };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  return {
    hasPending(observationId: string | number): boolean {
      return buckets.get(bucketKey(observationId))?.pending != null;
    },
    schedule(
      observationId: string | number,
      patch: ObservationMetaPatch,
      persist: (
        observationId: string | number,
        patch: ObservationMetaPatch,
      ) => Promise<void>,
    ): Promise<void> {
      const bucket = getBucket(observationId);
      bucket.pending = { ...bucket.pending, ...patch };
      const run = bucket.chain.then(async () => {
        while (bucket.pending) {
          const payload = bucket.pending;
          bucket.pending = null;
          try {
            await persist(observationId, payload);
          } catch {
            /* Keep draining later patches for this chronicle. */
          }
        }
      });
      bucket.chain = run;
      return run;
    },
  };
}

// Keep in-flight saves coordinated when the analysis component is remounted.
// A queue owned by setup() allows an old screen's response/write to race with
// the new screen's edits to the same chronicle.
export const observationGraphMetaPersistQueue = createObservationMetaPersistQueue();
