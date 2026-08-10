import type { Application } from 'pixi.js';
import { computeFitViewport } from '../utils/viewport.utils';
import type { WorldBounds } from '../utils/viewport.utils';

export interface ExportPipelineDeps {
  app: Application;
  isInteractive: () => boolean;
  getRequiredCanvasHeight: () => number;
  enqueueDrawBody: () => Promise<void>;
  setViewportTransform: (
    transform: { scale?: number; x?: number; y?: number },
    options?: { emitZoom?: boolean; skipRender?: boolean },
  ) => void;
  updateWorldBounds: () => void;
  recalculateFitViewport: () => void;
  getWorldBounds: () => WorldBounds;
  getZoomState: () => { scale: number; minScale: number; maxScale: number };
  getViewportTransform: () => { scale: number; x: number; y: number };
  setHoverSuppressed: (suppressed: boolean) => void;
}

/**
 * Captures the rendered stage via renderer.extract (not app.canvas.toDataURL).
 */
export class ExportPipeline {
  constructor(private readonly deps: ExportPipelineDeps) {}

  async exportAsImage(format: 'png' | 'jpeg', quality = 0.92): Promise<string | null> {
    const { app, isInteractive, setHoverSuppressed } = this.deps;

    if (!app.canvas || !app.renderer) {
      return null;
    }

    setHoverSuppressed(true);

    const originalWidth = app.screen.width;
    const originalHeight = app.screen.height;
    const requiredHeight = this.deps.getRequiredCanvasHeight();
    const exportHeight = Math.max(originalHeight, requiredHeight);

    const savedViewport = this.deps.getViewportTransform();

    let resizedForExport = false;
    try {
      if (isInteractive()) {
        if (exportHeight !== originalHeight) {
          app.renderer.resize(originalWidth, exportHeight);
          resizedForExport = true;
        }

        this.deps.updateWorldBounds();
        const exportCanvasSize = {
          width: originalWidth,
          height: exportHeight,
        };
        const zoomState = this.deps.getZoomState();
        const fitViewport = computeFitViewport(
          this.deps.getWorldBounds(),
          exportCanvasSize,
          zoomState.minScale,
          zoomState.maxScale,
        );
        this.deps.setViewportTransform(
          { scale: fitViewport.scaleX, x: fitViewport.x, y: fitViewport.y },
          { emitZoom: false, skipRender: true },
        );
      }

      await this.deps.enqueueDrawBody();
      app.render();

      const extractFormat = format === 'jpeg' ? 'jpg' : 'png';
      return await app.renderer.extract.base64({
        target: app.stage,
        format: extractFormat,
        quality,
      });
    } finally {
      try {
        if (isInteractive()) {
          if (resizedForExport) {
            app.renderer.resize(originalWidth, originalHeight);
            this.deps.updateWorldBounds();
            this.deps.recalculateFitViewport();
          }
          this.deps.setViewportTransform(savedViewport, { emitZoom: false, skipRender: true });
          await this.deps.enqueueDrawBody();
        }
      } finally {
        setHoverSuppressed(false);
      }
    }
  }
}
