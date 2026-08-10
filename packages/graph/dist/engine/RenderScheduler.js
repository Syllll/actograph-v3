export class RenderScheduler {
    constructor() {
        this.generation = 0;
        this.pending = false;
        this.running = false;
        this.needsReschedule = false;
        this.queue = [];
        this.flushWaiters = [];
        this.rafId = null;
        this.timeoutId = null;
    }
    bumpGeneration() {
        this.generation += 1;
        return this.generation;
    }
    getGeneration() {
        return this.generation;
    }
    request(task, options = {}) {
        const generation = this.generation;
        this.queue.push({
            generation,
            ignoreStale: options.ignoreStale ?? false,
            task,
        });
        this.scheduleFrame();
    }
    flush() {
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
    cancel() {
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
    scheduleFrame() {
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
    async runFrame() {
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
        }
        finally {
            this.running = false;
            this.resolveFlushWaiters();
            const shouldReschedule = this.needsReschedule || this.queue.length > 0;
            this.needsReschedule = false;
            if (shouldReschedule) {
                this.scheduleFrame();
            }
        }
    }
    resolveFlushWaiters() {
        const waiters = this.flushWaiters;
        this.flushWaiters = [];
        for (const resolve of waiters) {
            resolve();
        }
    }
}
//# sourceMappingURL=RenderScheduler.js.map