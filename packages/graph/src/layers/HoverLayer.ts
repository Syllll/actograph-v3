import {
  Application,
  Container,
  Graphics,
  Text,
} from 'pixi.js';
import {
  ObservationModeEnum,
  TimeDisplayFormatEnum,
  type IObservation,
} from '@actograph/core';
import { BaseGraphic } from '../lib/base-graphic';
import { BaseLayer } from './Layer';
import type { GraphContext } from '../engine/GraphContext';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';
import {
  computeCrosshairSegments,
  computeHoverTimeLabelPosition,
  type IPlotBounds,
} from '../utils/crosshair.utils';
import {
  isPointInsidePlotBounds,
  shouldRenderHoverOverlay,
} from '../utils/hover-overlay.utils';
import {
  formatFromDate,
  formatCalendarFixed,
  formatChronometerFixed,
} from '../utils/duration.utils';
import { CHRONOMETER_T0 } from '../utils/chronometer.constants';
import { safeMoveTo, safeRect } from '../utils/safe-graphics.utils';

export interface HoverWorldPointerInput {
  worldX: number;
  worldY: number;
  plotBoundsWorld: IPlotBounds;
  dateTime: Date;
  worldToOverlay: (p: { x: number; y: number }) => { x: number; y: number };
}

export interface HoverLayerBoundsDeps {
  getPlotBoundsInOverlay: () => IPlotBounds | null;
  clientPointToOverlayLocal: (clientX: number, clientY: number) => { x: number; y: number } | null;
  getCanvas: () => HTMLCanvasElement | null;
}

export class HoverLayer extends BaseLayer {
  readonly container: Container;
  private readonly app: Application;
  private readonly pointerDashedLines: BaseGraphic;
  private readonly timeLabelContainer: Container;
  private readonly timeLabel: Text;
  private readonly timeLabelBackground: Graphics;
  private readonly graphInteractionEnabled: boolean;

  private observation: IObservation | null = null;
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
  private hoverOverlaySuppressed = false;
  private hoverOverlayVisible = false;
  private lastTimeLabelText: string | null = null;

  private pendingWorldPointer: HoverWorldPointerInput | null = null;
  private hoverRafId: number | null = null;

  private boundsDeps: HoverLayerBoundsDeps | null = null;
  private drawInProgressGate: (() => boolean) | null = null;
  private unsafeToPaintGate: (() => boolean) | null = null;
  private exportInProgressGate: (() => boolean) | null = null;
  private requestRenderCallback: (() => void) | null = null;

  constructor(app: Application, options?: { interactive?: boolean }) {
    super('hover');
    this.app = app;
    this.graphInteractionEnabled = options?.interactive ?? true;

    this.container = new Container();
    this.pointerDashedLines = new BaseGraphic(app);
    this.container.addChild(this.pointerDashedLines);

    this.timeLabelContainer = new Container();
    this.timeLabelContainer.visible = false;
    this.container.addChild(this.timeLabelContainer);

    this.timeLabelBackground = new Graphics();
    this.timeLabelContainer.addChild(this.timeLabelBackground);

    this.timeLabel = new Text({
      text: '',
      style: {
        fontSize: 12,
        fill: 'black',
        fontFamily: 'Arial',
      },
    });
    this.timeLabelContainer.addChild(this.timeLabel);

    this.configurePassthrough();
  }

  prepare(_ctx: GraphContext): void {
    // Hover is event-driven; full draws clear via PixiApp.executeDrawBody.
  }

  public setBoundsDeps(deps: HoverLayerBoundsDeps): void {
    this.boundsDeps = deps;
  }

  public setDrawStateCallbacks(callbacks: {
    isDrawInProgress: () => boolean;
    isUnsafeToPaint: () => boolean;
    isExportInProgress: () => boolean;
    requestRender: () => void;
  }): void {
    this.drawInProgressGate = callbacks.isDrawInProgress;
    this.unsafeToPaintGate = callbacks.isUnsafeToPaint;
    this.exportInProgressGate = callbacks.isExportInProgress;
    this.requestRenderCallback = callbacks.requestRender;
  }

  public setObservation(observation: IObservation | null): void {
    this.observation = observation;
  }

  public setGraphRenderOptions(options: IGraphRenderOptions): void {
    this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS, ...options };
    this.lastTimeLabelText = null;
  }

  public init(): void {
    if (!this.graphInteractionEnabled) {
      this.container.visible = false;
      this.container.eventMode = 'none';
      this.pointerDashedLines.eventMode = 'none';
      this.timeLabelContainer.eventMode = 'none';
      this.timeLabelContainer.visible = false;
      return;
    }

    this.container.visible = true;
    this.configurePassthrough();
  }

  private configurePassthrough(): void {
    this.pointerDashedLines.eventMode = 'none';
    this.timeLabelContainer.eventMode = 'none';
    this.timeLabelBackground.eventMode = 'none';
    this.timeLabel.eventMode = 'none';
  }

  public clear(options?: { cancelPending?: boolean }): void {
    if (options?.cancelPending !== false) {
      this.cancelPendingHoverUpdate();
    }
    this.hoverOverlayVisible = false;
    this.pointerDashedLines.clear();
    this.timeLabelContainer.visible = false;
  }

  public dismiss(): void {
    const hadOverlay = this.hoverOverlayVisible;
    this.clear();
    if (hadOverlay) {
      this.paintAfterCleared();
    }
  }

  public setSuppressed(suppressed: boolean): void {
    this.hoverOverlaySuppressed = suppressed;
    if (suppressed) {
      this.clear();
    }
  }

  public syncDismissWithPointer(clientX: number, clientY: number): void {
    if (!this.graphInteractionEnabled || !this.hoverOverlayVisible) {
      return;
    }
    if (!this.isClientPointInsidePlot(clientX, clientY)) {
      this.dismiss();
    }
  }

  public scheduleUpdateFromWorldPointer(input: HoverWorldPointerInput): void {
    this.pendingWorldPointer = input;
    this.scheduleHoverUpdate();
  }

  public updateFromWorldPointer(input: HoverWorldPointerInput): void {
    if (this.drawInProgressGate?.() || this.exportInProgressGate?.()) {
      return;
    }

    if (this.unsafeToPaintGate?.()) {
      this.requestRenderCallback?.();
      return;
    }

    if (
      !shouldRenderHoverOverlay({
        interactive: this.graphInteractionEnabled,
        suppressed: this.hoverOverlaySuppressed,
      })
    ) {
      return;
    }

    const overlayBounds = this.boundsDeps?.getPlotBoundsInOverlay() ?? null;
    if (!overlayBounds) {
      this.dismiss();
      return;
    }

    const overlayCursor = input.worldToOverlay({ x: input.worldX, y: input.worldY });
    if (!isPointInsidePlotBounds(overlayCursor.x, overlayCursor.y, overlayBounds)) {
      this.dismiss();
      return;
    }

    const { vertical, horizontal } = computeCrosshairSegments(
      overlayCursor.x,
      overlayCursor.y,
      overlayBounds,
    );

    this.pointerDashedLines.clear();
    this.pointerDashedLines.setStrokeStyle({ color: 'black', width: 1, cap: 'butt' });
    if (safeMoveTo(this.pointerDashedLines, vertical.x1, vertical.y1)) {
      this.pointerDashedLines.dashedLineTo(vertical.x2, vertical.y2).stroke();
    }
    this.pointerDashedLines.setStrokeStyle({ color: 'black', width: 1, cap: 'butt' });
    if (safeMoveTo(this.pointerDashedLines, horizontal.x1, horizontal.y1)) {
      this.pointerDashedLines.dashedLineTo(horizontal.x2, horizontal.y2).stroke();
    }

    this.hoverOverlayVisible = true;

    try {
      const timeString = this.formatHoverTimeLabel(input.dateTime);
      if (this.lastTimeLabelText !== timeString) {
        this.timeLabel.text = timeString;
        this.lastTimeLabelText = timeString;
      }

      const padding = 4;
      const textWidth = this.timeLabel.width;
      const textHeight = this.timeLabel.height;
      const backgroundWidth = textWidth + padding * 2;
      const backgroundHeight = textHeight + padding * 2;

      this.timeLabelBackground.clear();
      safeRect(this.timeLabelBackground, 0, 0, backgroundWidth, backgroundHeight, {
        fill: { color: 'white' },
      });

      this.timeLabel.x = padding;
      this.timeLabel.y = padding;

      const labelPos = computeHoverTimeLabelPosition(
        overlayCursor.x,
        overlayCursor.y,
        backgroundWidth,
        backgroundHeight,
        overlayBounds,
      );
      this.timeLabelContainer.x = labelPos.x;
      this.timeLabelContainer.y = labelPos.y;
      this.timeLabelContainer.visible = true;
    } catch {
      this.timeLabelContainer.visible = false;
    }

    if (this.requestRenderCallback) {
      this.requestRenderCallback();
    } else {
      this.app.render();
    }
  }

  public destroy(): void {
    this.cancelPendingHoverUpdate();
    this.clear({ cancelPending: true });
    this.container.destroy({ children: true });
  }

  private formatHoverTimeLabel(dateTime: Date): string {
    const timeDisplayFormat =
      this.graphRenderOptions.timeDisplayFormat ?? TimeDisplayFormatEnum.Auto;
    const isChronometer = this.observation?.mode === ObservationModeEnum.Chronometer;

    if (timeDisplayFormat !== TimeDisplayFormatEnum.Auto) {
      return isChronometer
        ? formatChronometerFixed(dateTime, CHRONOMETER_T0, timeDisplayFormat)
        : formatCalendarFixed(dateTime, timeDisplayFormat);
    }
    if (isChronometer) {
      return formatFromDate(dateTime, CHRONOMETER_T0);
    }
    return dateTime
      .toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      })
      .replace(/\//g, '-');
  }

  private isClientPointInsidePlot(clientX: number, clientY: number): boolean {
    const deps = this.boundsDeps;
    if (!deps) {
      return false;
    }

    const bounds = deps.getPlotBoundsInOverlay();
    if (!bounds) {
      return false;
    }

    const canvas = deps.getCanvas();
    if (!canvas) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return false;
    }

    const overlayLocal = deps.clientPointToOverlayLocal(clientX, clientY);
    if (!overlayLocal) {
      return false;
    }

    return isPointInsidePlotBounds(overlayLocal.x, overlayLocal.y, bounds);
  }

  private paintAfterCleared(): void {
    if (this.drawInProgressGate?.() || this.exportInProgressGate?.() || !this.app.renderer) {
      return;
    }
    if (this.unsafeToPaintGate?.()) {
      this.requestRenderCallback?.();
      return;
    }
    this.app.render();
  }

  private cancelPendingHoverUpdate(): void {
    if (this.hoverRafId !== null) {
      cancelAnimationFrame(this.hoverRafId);
      this.hoverRafId = null;
    }
    this.pendingWorldPointer = null;
  }

  private scheduleHoverUpdate(): void {
    if (this.hoverRafId !== null) {
      return;
    }
    this.hoverRafId = requestAnimationFrame(() => this.onHoverRaf());
  }

  private onHoverRaf(): void {
    this.hoverRafId = null;
    if (this.drawInProgressGate?.() || this.exportInProgressGate?.()) {
      if (this.pendingWorldPointer) {
        this.scheduleHoverUpdate();
      }
      return;
    }

    const pending = this.pendingWorldPointer;
    this.pendingWorldPointer = null;
    if (pending) {
      if (this.unsafeToPaintGate?.()) {
        this.pendingWorldPointer = pending;
        this.requestRenderCallback?.();
        this.scheduleHoverUpdate();
        return;
      }
      this.updateFromWorldPointer(pending);
    }
  }
}
