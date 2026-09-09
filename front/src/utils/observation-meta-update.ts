/**
 * Applies a persisted meta payload only if the currently opened chronicle
 * is still the one that was saved. Stale responses after a chronicle switch
 * must not overwrite the new observation.
 */
export function mergeMetaIfSameObservation<T extends { id?: string; meta?: unknown }>(
  current: T | null | undefined,
  requestedId: string,
  meta: T['meta'] | null | undefined,
): T | null {
  if (!meta || !current?.id || current.id !== requestedId) {
    return null;
  }
  return {
    ...current,
    meta,
  };
}

/**
 * Serializes async work so only the latest scheduled task runs, and callers
 * can ignore responses from an older generation (slider spam, chronicle switch).
 */
export function createLatestWinsRunner() {
  let generation = 0;
  let chain: Promise<void> = Promise.resolve();

  return {
    isCurrent(gen: number): boolean {
      return gen === generation;
    },
    schedule(task: (generation: number) => Promise<void>): Promise<void> {
      const gen = ++generation;
      const run = chain.then(async () => {
        if (gen !== generation) {
          return;
        }
        await task(gen);
      });
      chain = run.catch(() => undefined);
      return run;
    },
  };
}
