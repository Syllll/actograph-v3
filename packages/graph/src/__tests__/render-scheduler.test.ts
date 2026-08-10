import { RenderScheduler } from '../engine/RenderScheduler';

describe('RenderScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at generation 0', () => {
    const scheduler = new RenderScheduler();
    expect(scheduler.getGeneration()).toBe(0);
  });

  it('bumps generation', () => {
    const scheduler = new RenderScheduler();
    expect(scheduler.bumpGeneration()).toBe(1);
    expect(scheduler.bumpGeneration()).toBe(2);
    expect(scheduler.getGeneration()).toBe(2);
  });

  it('coalesces multiple requests into one frame', async () => {
    const scheduler = new RenderScheduler();
    const runs: number[] = [];

    scheduler.request(() => {
      runs.push(1);
    });
    scheduler.request(() => {
      runs.push(2);
    });

    jest.runAllTimers();
    await scheduler.flush();

    expect(runs).toEqual([1, 2]);
  });

  it('skips stale tasks when generation changed before execution', async () => {
    const scheduler = new RenderScheduler();
    const runs: number[] = [];

    scheduler.request(() => {
      runs.push(1);
    });
    scheduler.bumpGeneration();
    scheduler.request(() => {
      runs.push(2);
    });

    jest.runAllTimers();
    await scheduler.flush();

    expect(runs).toEqual([2]);
  });

  it('skips tasks scheduled before a bump that runs in the same frame batch', async () => {
    const scheduler = new RenderScheduler();
    const runs: number[] = [];

    scheduler.request(() => {
      runs.push(1);
    });
    scheduler.bumpGeneration();

    jest.runAllTimers();
    await scheduler.flush();

    expect(runs).toEqual([]);
  });

  it('skips stale tasks with ignoreStale false after a bump', async () => {
    const scheduler = new RenderScheduler();
    let called = false;

    scheduler.request(() => {
      called = true;
    });
    scheduler.bumpGeneration();

    jest.runAllTimers();
    await scheduler.flush();

    expect(called).toBe(false);
  });

  it('runs stale tasks when ignoreStale is true after a bump', async () => {
    const scheduler = new RenderScheduler();
    let called = false;

    scheduler.request(
      () => {
        called = true;
      },
      { ignoreStale: true },
    );
    scheduler.bumpGeneration();

    jest.runAllTimers();
    await scheduler.flush();

    expect(called).toBe(true);
  });

  it('resets draw bookkeeping even when generation bumped (ignoreStale draw path)', async () => {
    const scheduler = new RenderScheduler();
    let drawFrameScheduled = true;
    const resolvers: Array<{ resolve: () => void }> = [{ resolve: jest.fn() }];

    scheduler.request(
      () => {
        drawFrameScheduled = false;
        const pending = resolvers;
        pending.forEach((r) => r.resolve());
      },
      { ignoreStale: true },
    );
    scheduler.bumpGeneration();

    jest.runAllTimers();
    await scheduler.flush();

    expect(drawFrameScheduled).toBe(false);
    expect(resolvers[0].resolve).toHaveBeenCalled();
  });

  it('does not reset draw bookkeeping when stale task is skipped', async () => {
    const scheduler = new RenderScheduler();
    let drawFrameScheduled = true;
    const resolvers: Array<{ resolve: () => void }> = [{ resolve: jest.fn() }];

    scheduler.request(() => {
      drawFrameScheduled = false;
      resolvers.forEach((r) => r.resolve());
    });
    scheduler.bumpGeneration();

    jest.runAllTimers();
    await scheduler.flush();

    expect(drawFrameScheduled).toBe(true);
    expect(resolvers[0].resolve).not.toHaveBeenCalled();
  });

  it('flush resolves when the pending frame completes', async () => {
    const scheduler = new RenderScheduler();
    let flushed = false;

    scheduler.request(() => undefined);
    const flushPromise = scheduler.flush().then(() => {
      flushed = true;
    });

    expect(flushed).toBe(false);
    jest.runAllTimers();
    await flushPromise;
    expect(flushed).toBe(true);
  });

  it('cancel clears pending tasks and resolves flush waiters', async () => {
    const scheduler = new RenderScheduler();
    const runs: number[] = [];

    scheduler.request(() => {
      runs.push(1);
    });

    const flushPromise = scheduler.flush();
    scheduler.cancel();
    await flushPromise;

    jest.runAllTimers();
    expect(runs).toEqual([]);
  });

  it('does not run concurrent runFrame loops when requests arrive during execution', async () => {
    const scheduler = new RenderScheduler();
    const runs: number[] = [];
    let concurrent = 0;
    let maxConcurrent = 0;

    scheduler.request(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      runs.push(1);
      await Promise.resolve();
      scheduler.request(() => {
        runs.push(2);
      });
      concurrent -= 1;
    });

    const flushPromise = scheduler.flush();
    await jest.runAllTimersAsync();
    await flushPromise;

    expect(runs).toEqual([1, 2]);
    expect(maxConcurrent).toBe(1);
  });

  it('uses requestAnimationFrame when available', async () => {
    const raf = jest.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;

    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: raf,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: jest.fn(),
    });

    try {
      const scheduler = new RenderScheduler();
      const runs: number[] = [];

      scheduler.request(() => {
        runs.push(1);
      });
      await scheduler.flush();

      expect(raf).toHaveBeenCalledTimes(1);
      expect(runs).toEqual([1]);
    } finally {
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        value: originalRaf,
      });
      Object.defineProperty(globalThis, 'cancelAnimationFrame', {
        configurable: true,
        value: originalCancel,
      });
    }
  });
});
