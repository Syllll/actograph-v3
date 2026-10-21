import type { IObservation } from '@actograph/core';

export interface MiniGraphEngine {
  init(options: { view: HTMLCanvasElement; reserveAxisLabelSpace?: boolean }): Promise<void>;
  setData(observation: IObservation): void;
  setSelectedReadingTime(time: number | null): void;
  setGraphRenderOptions(options: Record<string, unknown>, drawOptions: { redraw: boolean }): void;
  resizeFromCanvas(options: { skipRender: boolean }): boolean;
  draw(): Promise<void>;
  settleInitialLayoutFit(): Promise<void>;
  setAxisStretch(next: { x: number; y: number }, options: { redraw: boolean }): Promise<void>;
  destroy(): void;
}

/** Owns exactly one engine. Latest requests win; no work is queued after disposal. */
export class MiniGraphRenderer {
  private disposed = false;
  private ready = false;
  private running = false;
  private pending = false;
  private resizePending = false;
  private fitPending = false;
  private observation: IObservation | null = null;
  private selection: number | null = null;
  private options: Record<string, unknown> = {};

  constructor(private engine: MiniGraphEngine, private onError: (error: unknown) => void,
    private onReady: () => void) {}

  async init(canvas: HTMLCanvasElement): Promise<void> {
    try {
      await this.engine.init({ view: canvas, reserveAxisLabelSpace: true });
      if (this.disposed) return;
      this.ready = true;
      await this.flush();
    } catch (error) {
      if (!this.disposed) this.onError(error);
    }
  }

  update(observation: IObservation, options: Record<string, unknown>): void {
    if (this.disposed) return;
    this.observation = observation;
    this.options = options;
    this.pending = true;
    void this.flush();
  }

  select(time: number | null): void {
    this.selection = time;
    if (this.ready && !this.disposed) this.engine.setSelectedReadingTime(time);
  }

  resize(): void {
    if (this.disposed) return;
    this.resizePending = true;
    void this.flush();
  }

  fit(): void {
    if (this.disposed) return;
    this.fitPending = true;
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.disposed || !this.ready || this.running) return;
    this.running = true;
    try {
      while (!this.disposed && (this.pending || this.resizePending || this.fitPending)) {
        const observation = this.observation;
        const dataChanged = this.pending;
        const resize = this.resizePending;
        const fit = this.fitPending;
        this.pending = this.resizePending = this.fitPending = false;
        if (!observation?.protocol) continue;
        if (dataChanged) {
          this.engine.setGraphRenderOptions(this.options, { redraw: false });
          this.engine.setData(observation);
          const stretch = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 1;
          await this.engine.setAxisStretch({
            x: stretch(observation.meta?.graphXStretch), y: stretch(observation.meta?.graphYCompact),
          }, { redraw: false });
          if (this.disposed) return;
        }
        if (resize) this.engine.resizeFromCanvas({ skipRender: true });
        this.engine.setSelectedReadingTime(this.selection);
        if (fit) await this.engine.settleInitialLayoutFit();
        else await this.engine.draw();
        if (!this.disposed) this.onReady();
      }
    } catch (error) {
      if (!this.disposed) this.onError(error);
    } finally {
      this.running = false;
      // Requests arriving during a failed draw must not remain stranded.
      if (!this.disposed && (this.pending || this.resizePending || this.fitPending)) void this.flush();
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending = this.resizePending = this.fitPending = false;
    this.observation = null;
    this.engine.destroy();
  }
}
