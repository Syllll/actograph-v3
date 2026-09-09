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
