/** True when this PixiApp is still the shared instance and its engine is usable. */
export function shouldCommitGraphInit<T>(
  currentInstance: T | null | undefined,
  initializedInstance: T,
  isEngineReady: (instance: T) => boolean,
): boolean {
  return currentInstance === initializedInstance && isEngineReady(initializedInstance);
}
