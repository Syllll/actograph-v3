/** Serialize startup and keep a recovery request that arrives during a failure. */
export function createStartupRunner(task: () => Promise<boolean>) {
  let inFlight: Promise<void> | undefined;
  let requested = false;
  let disposed = false;
  let completed = false;
  return {
    run(): Promise<void> {
      if (disposed || completed) return Promise.resolve();
      requested = true;
      if (inFlight) return inFlight;
      inFlight = (async () => {
        while (requested && !disposed && !completed) {
          requested = false;
          completed = await task();
        }
      })().finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
    dispose(): void {
      disposed = true;
    },
  };
}
