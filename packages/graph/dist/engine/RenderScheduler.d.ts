type RenderTask = (generation: number) => void | Promise<void>;
export interface RenderSchedulerRequestOptions {
    /** When true, run even if generation changed since request (e.g. draw cleanup). */
    ignoreStale?: boolean;
}
export declare class RenderScheduler {
    private generation;
    private pending;
    private running;
    private needsReschedule;
    private queue;
    private flushWaiters;
    private rafId;
    private timeoutId;
    bumpGeneration(): number;
    getGeneration(): number;
    request(task: RenderTask, options?: RenderSchedulerRequestOptions): void;
    /** Resolves when the queue is idle, including frames requested during the current run. */
    flush(): Promise<void>;
    cancel(): void;
    private scheduleFrame;
    private runFrame;
    private resolveFlushWaiters;
}
export {};
//# sourceMappingURL=RenderScheduler.d.ts.map