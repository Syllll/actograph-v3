import {
  mergeMetaIfSameObservation,
  createObservationMetaPersistQueue,
  observationGraphMetaPersistQueue,
} from './observation-meta-update';

describe('mergeMetaIfSameObservation', () => {
  it('merges meta when the current observation is still the saved one', () => {
    const current = { id: 'obs-a', name: 'A', meta: { graphXStretch: 1 } as Record<string, unknown> };
    const next = mergeMetaIfSameObservation(current, 'obs-a', {
      graphXStretch: 2,
      graphYCompact: 0.8,
    });

    expect(next).toEqual({
      id: 'obs-a',
      name: 'A',
      meta: { graphXStretch: 2, graphYCompact: 0.8 },
    });
  });

  it('compares observation ids as strings', () => {
    const current = { id: 12, meta: { graphXStretch: 1 } };
    expect(mergeMetaIfSameObservation(current, '12', { graphXStretch: 3 })?.meta).toEqual({
      graphXStretch: 3,
    });
  });

  it('discards a stale response after switching chronicle', () => {
    const currentB = { id: 'obs-b', name: 'B', meta: { graphXStretch: 1 } };
    const fromA = { graphXStretch: 2, graphYCompact: 0.8 };

    expect(mergeMetaIfSameObservation(currentB, 'obs-a', fromA)).toBeNull();
  });

  it('returns null when meta is missing', () => {
    const current = { id: 'obs-a', meta: {} };
    expect(mergeMetaIfSameObservation(current, 'obs-a', undefined)).toBeNull();
  });
});

describe('createObservationMetaPersistQueue', () => {
  it('coordinates old and remounted graph consumers until both saves finish', async () => {
    const queue = observationGraphMetaPersistQueue;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const applied: number[] = [];
    const saved: number[] = [];
    let running = 0;
    let maxRunning = 0;
    const makeConsumer = () => async (id: string | number, patch: Record<string, unknown>) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      if (patch.graphXStretch === 1.5) await gate;
      saved.push(patch.graphXStretch as number);
      if (!queue.hasPending(id)) applied.push(patch.graphXStretch as number);
      running -= 1;
    };

    const oldScreen = queue.schedule('remounted-observation', { graphXStretch: 1.5 }, makeConsumer());
    await Promise.resolve();
    const newScreen = queue.schedule('remounted-observation', { graphXStretch: 3 }, makeConsumer());
    release();
    await Promise.all([oldScreen, newScreen]);

    expect(maxRunning).toBe(1);
    expect(saved).toEqual([1.5, 3]);
    expect(applied).toEqual([3]);
  });

  it('treats numeric and string ids as the same chronicle', async () => {
    const queue = createObservationMetaPersistQueue();
    const calls: Array<{ id: string | number; patch: Record<string, unknown> }> = [];

    const persist = async (id: string | number, patch: Record<string, unknown>) => {
      calls.push({ id, patch });
    };

    const first = queue.schedule(12, { timeDisplayFormat: 'hms' }, persist);
    const second = queue.schedule('12', { graphXStretch: 3 }, persist);

    await Promise.allSettled([first, second]);

    expect(calls).toEqual([
      { id: 12, patch: { timeDisplayFormat: 'hms', graphXStretch: 3 } },
    ]);
  });

  it('coalesces format and stretch into one persist when both are queued before start', async () => {
    const queue = createObservationMetaPersistQueue();
    const calls: Array<{ id: string | number; patch: Record<string, unknown> }> = [];

    const persist = async (id: string | number, patch: Record<string, unknown>) => {
      calls.push({ id, patch });
    };

    const first = queue.schedule('obs-a', { timeDisplayFormat: 'hms' }, persist);
    const second = queue.schedule('obs-a', { graphXStretch: 3, graphYCompact: 1 }, persist);

    await Promise.allSettled([first, second]);

    expect(calls).toEqual([
      {
        id: 'obs-a',
        patch: { timeDisplayFormat: 'hms', graphXStretch: 3, graphYCompact: 1 },
      },
    ]);
  });

  it('does not apply a format response while a stretch patch is still pending', async () => {
    const queue = createObservationMetaPersistQueue();
    const applied: Array<Record<string, unknown>> = [];
    let releaseFormat: () => void = () => undefined;
    const formatGate = new Promise<void>((resolve) => {
      releaseFormat = resolve;
    });

    const persist = async (id: string | number, patch: Record<string, unknown>) => {
      if (patch.timeDisplayFormat != null && patch.graphXStretch == null) {
        await formatGate;
      }
      if (queue.hasPending(id)) {
        return;
      }
      applied.push(patch);
    };

    const first = queue.schedule('obs-a', { timeDisplayFormat: 'hms' }, persist);
    await Promise.resolve();
    const second = queue.schedule('obs-a', { graphXStretch: 3 }, persist);

    releaseFormat();
    await Promise.allSettled([first, second]);

    expect(applied).toEqual([{ graphXStretch: 3 }]);
  });

  it('still flushes chronicle A after chronicle B is scheduled', async () => {
    const queue = createObservationMetaPersistQueue();
    const calls: Array<{ id: string | number; patch: Record<string, unknown> }> = [];
    let releaseA: () => void = () => undefined;
    const aGate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    const persist = async (id: string | number, patch: Record<string, unknown>) => {
      if (id === 'obs-a' && patch.graphXStretch === 1.5) {
        await aGate;
      }
      calls.push({ id, patch });
    };

    const aFirst = queue.schedule('obs-a', { graphXStretch: 1.5 }, persist);
    await Promise.resolve();
    const aSecond = queue.schedule('obs-a', { graphXStretch: 3 }, persist);
    const bFirst = queue.schedule('obs-b', { graphXStretch: 2 }, persist);

    releaseA();
    await Promise.allSettled([aFirst, aSecond, bFirst]);

    expect(calls).toEqual(
      expect.arrayContaining([
        { id: 'obs-a', patch: { graphXStretch: 1.5 } },
        { id: 'obs-a', patch: { graphXStretch: 3 } },
        { id: 'obs-b', patch: { graphXStretch: 2 } },
      ]),
    );
    expect(calls.filter((call) => call.id === 'obs-a' && call.patch.graphXStretch === 3)).toHaveLength(
      1,
    );
  });

  it('keeps draining a chronicle if an earlier persist fails', async () => {
    const queue = createObservationMetaPersistQueue();
    const calls: Array<Record<string, unknown>> = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const persist = async (_id: string | number, patch: Record<string, unknown>) => {
      if (patch.graphXStretch === 1.5) {
        await firstGate;
        throw new Error('network');
      }
      calls.push(patch);
    };

    const first = queue.schedule('obs-a', { graphXStretch: 1.5 }, persist);
    await Promise.resolve();
    const second = queue.schedule('obs-a', { graphXStretch: 3 }, persist);

    releaseFirst();
    await Promise.allSettled([first, second]);

    expect(calls).toEqual([{ graphXStretch: 3 }]);
  });
});
