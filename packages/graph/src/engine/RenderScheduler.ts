type RenderTask = (generation: number) => void | Promise<void>;

export interface RenderSchedulerRequestOptions {
  /** When true, run even if generation changed since request (e.g. draw cleanup). */
  ignoreStale?: boolean;
}

interface QueuedTask {
  generation: number;
  ignoreStale: boolean;
  task: RenderTask;
}

export class RenderScheduler {
  private generation = 0;
  private pending = false;
  private running = false;
  private needsReschedule = false;
  private queue: QueuedTask[] = [];
  private flushWaiters: Array<() => void> = [];
  private rafId: number | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  bumpGeneration(): number {
    this.generation += 1;
    return this.generation;
  }

  getGeneration(): number {
    return this.generation;
  }

  request(task: RenderTask, options: RenderSchedulerRequestOptions = {}): void {
    const generation = this.generation;
    this.queue.push({
      generation,
      ignoreStale: options.ignoreStale ?? false,
      task,
    });
    this.scheduleFrame();
  }

  flush(): Promise<void> {
    if (!this.pending && !this.running && this.queue.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.flushWaiters.push(resolve);
      if (!this.pending && !this.running && this.queue.length > 0) {
        this.scheduleFrame();
      }
    });
  }

  cancel(): void {
    if (this.rafId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pending = false;
    this.needsReschedule = false;
    this.queue = [];
    this.resolveFlushWaiters();
  }

  private scheduleFrame(): void {
    if (this.running) {
      this.needsReschedule = true;
      return;
    }

    if (this.pending) {
      return;
    }

    this.pending = true;

    if (typeof globalThis.requestAnimationFrame === 'function') {
      this.rafId = globalThis.requestAnimationFrame(() => {
        void this.runFrame();
      });
      return;
    }

    this.timeoutId = setTimeout(() => {
      void this.runFrame();
    }, 0);
  }

  private async runFrame(): Promise<void> {
    this.pending = false;
    this.rafId = null;
    this.timeoutId = null;

    const batch = this.queue;
    this.queue = [];
    const currentGeneration = this.generation;

    this.running = true;
    try {
      for (const { generation, ignoreStale, task } of batch) {
        if (!ignoreStale && generation !== currentGeneration) {
          continue;
        }
        await task(currentGeneration);
      }
    } finally {
      this.running = false;
      this.resolveFlushWaiters();
      const shouldReschedule = this.needsReschedule || this.queue.length > 0;
      this.needsReschedule = false;
      if (shouldReschedule) {
        this.scheduleFrame();
      }
    }
  }

  private resolveFlushWaiters(): void {
    const waiters = this.flushWaiters;
    this.flushWaiters = [];
    for (const resolve of waiters) {
      resolve();
    }
  }
}
