import { mergeMetaIfSameObservation, createLatestWinsRunner } from './observation-meta-update';

describe('mergeMetaIfSameObservation', () => {
  it('merges meta when the current observation is still the saved one', () => {
    const current = { id: 'obs-a', name: 'A', meta: { graphXStretch: 1 } };
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

describe('createLatestWinsRunner', () => {
  it('does not start a superseded task', async () => {
    const runner = createLatestWinsRunner();
    const started: number[] = [];

    const first = runner.schedule(async (generation) => {
      started.push(generation);
    });
    const second = runner.schedule(async (generation) => {
      started.push(generation);
    });

    await Promise.allSettled([first, second]);

    expect(started).toEqual([2]);
  });

  it('ignores a completed stale response after a newer task is scheduled', async () => {
    const runner = createLatestWinsRunner();
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const applied: number[] = [];

    const first = runner.schedule(async (generation) => {
      await firstGate;
      if (!runner.isCurrent(generation)) {
        return;
      }
      applied.push(15);
    });
    await Promise.resolve();
    const second = runner.schedule(async (generation) => {
      if (!runner.isCurrent(generation)) {
        return;
      }
      applied.push(30);
    });

    releaseFirst();
    await Promise.allSettled([first, second]);

    expect(applied).toEqual([30]);
  });
});
