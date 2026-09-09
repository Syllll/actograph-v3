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
  resizeRenderer: (width: number, height: number) => void;
  presentCommittedScene: () => void;
}

/**
 * Captures the rendered stage via renderer.extract (not app.canvas.toDataURL).
 */
export class ExportPipeline {
  constructor(private readonly deps: ExportPipelineDeps) {}

  async exportAsImage(format: 'png' | 'jpeg', quality = 0.92): Promise<string | null> {
    const { app, isInteractive, setHoverSuppressed } = this.deps;

    const renderer = app.renderer;
    const stage = app.stage;
    if (!renderer || !stage || !app.canvas) {
      return null;
    }
    // Closing the analysis screen can destroy Pixi while draw/extract awaits.
    const isAvailable = () =>
      app.renderer === renderer && app.stage === stage && !stage.destroyed;

    setHoverSuppressed(true);

    const originalWidth = app.screen.width;
    const originalHeight = app.screen.height;
    const requiredHeight = this.deps.getRequiredCanvasHeight();
    const exportHeight = Math.max(originalHeight, requiredHeight);

    const savedViewport = this.deps.getViewportTransform();

    let resizedForExport = false;
    let image: string | null = null;
    try {
      if (isInteractive()) {
        if (exportHeight !== originalHeight) {
          this.deps.resizeRenderer(originalWidth, exportHeight);
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
        // renderer.resize clears the default framebuffer (Windows/ANGLE).
        // Present before the async draw so the CSS box is not left empty.
        this.deps.presentCommittedScene();
      }

      // enqueueDrawBody paints on success via PixiApp.paint('draw-complete').
      await this.deps.enqueueDrawBody();
      if (!isAvailable()) return null;

      const extractFormat = format === 'jpeg' ? 'jpg' : 'png';
      image = await renderer.extract.base64({
        target: stage,
        format: extractFormat,
        quality,
        // extract() does not inherit Application background; without this the
        // PNG is transparent and JPEG composites on black (unreadable axes).
        clearColor: '#ffffff',
      });
    } catch (error) {
      if (!isAvailable()) return null;
      throw error;
    } finally {
      try {
        if (isAvailable() && isInteractive()) {
          if (resizedForExport) {
            this.deps.resizeRenderer(originalWidth, originalHeight);
            this.deps.updateWorldBounds();
            this.deps.recalculateFitViewport();
          }
          this.deps.setViewportTransform(savedViewport, { emitZoom: false, skipRender: true });
          this.deps.presentCommittedScene();
          await this.deps.enqueueDrawBody();
        }
      } finally {
        if (isAvailable()) setHoverSuppressed(false);
      }
    }
    return isAvailable() ? image : null;
  }
}
