import { Application } from 'pixi.js';
import type { AxisLabelDescriptor } from '../../layers/AxisLabelOverlay';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import type { IReading, IObservation } from '@actograph/core';
import {
  getGraphDisplayTimeBounds,
  ObservationModeEnum,
  ReadingTypeEnum,
  TimeDisplayFormatEnum,
} from '@actograph/core';
import { YAxis } from './y-axis';
import {
  formatAxisLabel,
  formatChronoAxisLabel,
  formatCalendarFixed,
  formatChronometerFixed,
  getCalendarFixedFormatNotation,
} from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';
import { safeMoveTo, safeLineTo, safeStrokeLine } from '../../utils/safe-graphics.utils';
import type { IGraphRenderOptions } from '../../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';

const timeSteps = {
  '10ms': 10,
  '100ms': 100,
  '1s': 1000,
  '10s': 10 * 1000,
  '1m': 60 * 1000,
  '10m': 60 * 10 * 1000,
  '30m': 60 * 30 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 60 * 60 * 2 * 1000,
  '4h': 60 * 60 * 4 * 1000,
  '6h': 60 * 60 * 6 * 1000,
  '8h': 60 * 60 * 8 * 1000,
  '12h': 60 * 60 * 12 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '2d': 24 * 60 * 60 * 2 * 1000,
  '3d': 24 * 60 * 60 * 3 * 1000,
  '4d': 24 * 60 * 60 * 4 * 1000,
  '5d': 24 * 60 * 60 * 5 * 1000,
  '6d': 24 * 60 * 60 * 6 * 1000,
  '7d': 24 * 60 * 60 * 7 * 1000,
  '8d': 24 * 60 * 60 * 8 * 1000,
  '1w': 24 * 60 * 60 * 7 * 1000,
  '2w': 24 * 60 * 60 * 14 * 1000,
  '3w': 24 * 60 * 60 * 21 * 1000,
  '4w': 24 * 60 * 60 * 28 * 1000,
  '1M': 24 * 60 * 60 * 30 * 1000,
  '2M': 24 * 60 * 60 * 60 * 1000,
  '3M': 24 * 60 * 60 * 90 * 1000,
  '6M': 24 * 60 * 60 * 180 * 1000,
  '1y': 24 * 60 * 60 * 365 * 1000,
  '2y': 24 * 60 * 60 * 365 * 2 * 1000,
  '3y': 24 * 60 * 60 * 365 * 3 * 1000,
  '4y': 24 * 60 * 60 * 365 * 4 * 1000,
  '5y': 24 * 60 * 60 * 365 * 5 * 1000,
  '6y': 24 * 60 * 60 * 365 * 6 * 1000,
  '10y': 24 * 60 * 60 * 365 * 10 * 1000,
  '20y': 24 * 60 * 60 * 365 * 20 * 1000,
};

export class xAxis extends BaseGroup {
  private displayGraphic: BaseGraphic;
  private paintGraphic: BaseGraphic;
  /** Cible de dessin courante (paint buffer pendant beginPaint…commitPaint). */
  private graphic: BaseGraphic;
  private readings: IReading[] = [];
  private yAxis: YAxis;
  private pixelsPerMsec = 0;
  private axisStartTimeInMsec = 0;
  private axisEndTimeInMsec = 0;
  /** Min/max timestamps from setData (START/STOP or sorted bounds) */
  private minTimeInMsec = 0;
  private maxTimeInMsec = 0;
  /** Total duration in ms for adaptive label formatting (Bug 3.9) */
  private totalDurationMs = 0;
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };

  private styleOptions = {
    axis: { color: 'black', width: 2 },
    tick: { color: 'black', width: 1 },
    label: { color: 'black', fontSize: 12, fontFamily: 'Arial' },
    /** Mention de format sous la flèche de fin d'axe (ex. "(hh:mn:sec)") — voir getFormatMentionText(). */
    formatMention: { color: '#666666', fontSize: 11, fontFamily: 'Arial', fontStyle: 'italic' as const },
  };

  private ticks: { dateTime: Date; label: string; pos?: number }[] = [];
  private axisStart: { x: number; y: number } | null = null;
  private axisEnd: { x: number; y: number } | null = null;

  public setAxisStretch(_stretch: { x: number; y: number }): void {
    // Labels en screen-space via AxisLabelOverlay ; stretch conservé pour compat API.
  }

  public getAxisStart() {
    return { ...this.axisStart };
  }

  public getAxisEnd() {
    return { ...this.axisEnd };
  }

  constructor(app: Application, yAxis: YAxis) {
    super(app);
    this.yAxis = yAxis;
    this.displayGraphic = new BaseGraphic(this.app);
    this.paintGraphic = new BaseGraphic(this.app);
    this.paintGraphic.visible = false;
    this.addChild(this.displayGraphic);
    this.addChild(this.paintGraphic);
    this.graphic = this.paintGraphic;
  }

  public beginPaint(): void {
    this.graphic = this.paintGraphic;
    this.paintGraphic.clear();
    this.paintGraphic.x = 0;
    this.paintGraphic.y = 0;
    this.x = 0;
    this.y = 0;
    this.scale.set(1);
    this.rotation = 0;
  }

  public commitPaint(): void {
    if (!this.hasPaintContent()) {
      this.paintGraphic.clear();
      this.graphic = this.displayGraphic;
      return;
    }

    this.displayGraphic.visible = false;
    this.paintGraphic.visible = true;

    const previousDisplay = this.displayGraphic;
    this.displayGraphic = this.paintGraphic;
    this.paintGraphic = previousDisplay;

    this.paintGraphic.visible = false;
    this.paintGraphic.clear();
    this.graphic = this.displayGraphic;
  }

  /** True when the back buffer has stroke geometry ready to swap in. */
  public hasPaintContent(): boolean {
    const bounds = this.paintGraphic.getLocalBounds();
    return bounds.width > 0 || bounds.height > 0;
  }

  private getReadingTimeInMsec(reading: IReading): number | null {
    const timeInMsec = new Date(reading.dateTime).getTime();
    return Number.isFinite(timeInMsec) ? timeInMsec : null;
  }

  public getPosFromDateTime(dateTime: Date | string): number {
    const dateTimeInMsec = new Date(dateTime).getTime();
    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || typeof axisStart.x !== 'number') {
      throw new Error('No axis start found');
    }
    const pos = axisStart.x + (dateTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;
    return pos;
  }

  public getDateTimeFromPos(xPos: number): Date {
    if (this.pixelsPerMsec === 0) {
      throw new Error('Axis not initialized: pixelsPerMsec is 0');
    }
    if (this.axisStartTimeInMsec === 0) {
      throw new Error('Axis not initialized: axisStartTimeInMsec is 0');
    }
    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || axisStart.x === undefined) {
      throw new Error('No axis start found');
    }
    const pixelsFromStart = xPos - axisStart.x;
    const timeDiffInMsec = pixelsFromStart / this.pixelsPerMsec;
    const dateTimeInMsec = this.axisStartTimeInMsec + timeDiffInMsec;
    return new Date(dateTimeInMsec);
  }

  public clear() {
    this.displayGraphic.clear();
    this.paintGraphic.clear();
    this.ticks = [];
    this.pixelsPerMsec = 0;
    this.axisStartTimeInMsec = 0;
    this.axisEndTimeInMsec = 0;
    this.minTimeInMsec = 0;
    this.maxTimeInMsec = 0;
    this.totalDurationMs = 0;
    super.clear();
  }

  /**
   * Met à jour le format d'affichage du temps. Ne touche ni aux bornes ni au
   * pas de temps de l'axe (calculés dans setData) : recalcule uniquement le
   * texte des labels déjà présents, pour permettre un changement de format à
   * chaud sans recharger l'observation.
   */
  public setGraphRenderOptions(options: IGraphRenderOptions): void {
    this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS, ...options };
    if (this.ticks.length > 0) {
      this.ticks = this.ticks.map((tick) => ({
        ...tick,
        label: this.computeLabelForTick(tick.dateTime),
      }));
    }
  }

  /**
   * Largeur d'un texte pour le style des labels de tick, via un canvas 2D
   * hors-DOM réutilisé (measureText). Fallback grossier si `document` n'est
   * pas disponible (SSR).
   */
  private measureTextWidth(
    text: string,
    fontSize: number,
    fontFamily: string,
    fontStyle?: string,
  ): number {
    if (typeof document === 'undefined') {
      return text.length * fontSize * 0.6;
    }
    if (!xAxis.measureCanvas) {
      xAxis.measureCanvas = document.createElement('canvas');
    }
    const ctx = xAxis.measureCanvas.getContext('2d');
    if (!ctx) {
      return text.length * fontSize * 0.6;
    }
    const stylePrefix = fontStyle ? `${fontStyle} ` : '';
    ctx.font = `${stylePrefix}${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  }

  private measureLabelWidth(text: string): number {
    return this.measureTextWidth(
      text,
      this.styleOptions.label.fontSize,
      this.styleOptions.label.fontFamily,
    );
  }

  /**
   * Espace vertical nécessaire sous la ligne de l'axe X pour contenir
   * entièrement les labels de tick, inclinés à 45°. `getRequiredHeight()` de
   * YAxis ne réservait qu'une marge fixe de 20px, insuffisante dès que les
   * labels dépassent quelques caractères (ex. format "Full" : 24 caractères)
   * — d'où le rognage observé en export PNG/JPEG quand le canvas est
   * redimensionné exactement à la hauteur "requise".
   */
  public getRequiredBottomMargin(): number {
    if (this.ticks.length === 0) return 0;

    let maxLabelWidth = 0;
    for (const tick of this.ticks) {
      if (!tick.label) continue;
      const width = this.measureLabelWidth(tick.label);
      if (width > maxLabelWidth) maxLabelWidth = width;
    }
    if (maxLabelWidth === 0) return 0;

    const angleRad = (45 * Math.PI) / 180;
    const fontSize = this.styleOptions.label.fontSize;
    // Étendue verticale de la boîte de texte pivotée à 45° depuis son point
    // d'ancrage (proche du coin haut-gauche, voir anchor.set(-0.05, 0) dans draw()).
    const rotatedExtent = maxLabelWidth * Math.sin(angleRad) + fontSize * Math.cos(angleRad);
    const labelOffsetFromAxis = 12; // doit rester aligné avec `label.y = xAxisStart.y + 12` dans draw()
    const safetyPadding = 8;

    return Math.ceil(labelOffsetFromAxis + rotatedExtent + safetyPadding);
  }

  /** Canvas hors-DOM réutilisé pour mesurer les labels (measureText), partagé entre instances. */
  private static measureCanvas: HTMLCanvasElement | null = null;

  private computeLabelForTick(dateTime: Date): string {
    const format = this.graphRenderOptions.timeDisplayFormat ?? TimeDisplayFormatEnum.Auto;
    const isChronometer = this.observation?.mode === ObservationModeEnum.Chronometer;

    if (format !== TimeDisplayFormatEnum.Auto) {
      return isChronometer
        ? formatChronometerFixed(dateTime, CHRONOMETER_T0, format)
        : formatCalendarFixed(dateTime, format);
    }

    return isChronometer
      ? formatChronoAxisLabel(dateTime, CHRONOMETER_T0, this.totalDurationMs)
      : formatAxisLabel(dateTime, this.totalDurationMs);
  }

  /**
   * Mention de format affichée sous la flèche de fin d'axe (ex. "(hh:mn:sec)").
   * Uniquement pour un format fixe (pas Auto, adaptatif donc auto-descriptif)
   * en mode calendrier (le mode chronomètre porte déjà l'unité en toutes
   * lettres dans chaque valeur, ex. "62m03s" — pas d'ambiguïté à lever).
   */
  private getFormatMentionText(): string | null {
    const format = this.graphRenderOptions.timeDisplayFormat ?? TimeDisplayFormatEnum.Auto;
    if (format === TimeDisplayFormatEnum.Auto) return null;
    if (this.observation?.mode === ObservationModeEnum.Chronometer) return null;
    return `(${getCalendarFixedFormatNotation(format)})`;
  }

  public setData(observation: IObservation) {
    super.setData(observation);

    const readings = observation.readings;
    if (!readings?.length) {
      const now = Date.now();
      this.readings = [];
      this.minTimeInMsec = now;
      this.maxTimeInMsec = now + 1;
      this.totalDurationMs = 1;
      this.ticks = [{ dateTime: new Date(now), label: '' }];
      return;
    }

    this.readings = readings;

    // Bug 3.3: Use graph display bounds (START through last STOP, or in-progress session)
    const sortedByTime = [...readings].sort((a, b) => {
      const ta = this.getReadingTimeInMsec(a) ?? 0;
      const tb = this.getReadingTimeInMsec(b) ?? 0;
      return ta - tb;
    });

    const displayBounds = getGraphDisplayTimeBounds(readings);

    let minTimeInMsec: number;
    let maxTimeInMsec: number;

    if (displayBounds) {
      minTimeInMsec = displayBounds.startMs;
      maxTimeInMsec = displayBounds.endMs;
    } else {
      minTimeInMsec = this.getReadingTimeInMsec(sortedByTime[0]!) ?? Date.now();
      maxTimeInMsec =
        this.getReadingTimeInMsec(sortedByTime[sortedByTime.length - 1]!) ?? minTimeInMsec + 1;
    }

    // Some legacy mobile auto-corrections persisted START at Unix epoch (1970-01-01).
    // In Calendar mode this creates absurd decades-long axes. If we detect this sentinel,
    // realign the axis start to the earliest non-START reading.
    if (this.observation?.mode !== ObservationModeEnum.Chronometer && minTimeInMsec <= 1000) {
      const firstNonStart = sortedByTime.find((r) => r.type !== ReadingTypeEnum.START);
      const firstNonStartTime = firstNonStart ? this.getReadingTimeInMsec(firstNonStart) : null;
      if (firstNonStartTime !== null) {
        minTimeInMsec = firstNonStartTime;
      }
    }

    // Bug 3.8: Guard against invalid dates (NaN)
    if (!Number.isFinite(minTimeInMsec)) minTimeInMsec = Date.now();
    if (!Number.isFinite(maxTimeInMsec)) maxTimeInMsec = minTimeInMsec + 1;

    // Bug 3.8: Ensure min <= max (chronological order)
    if (minTimeInMsec > maxTimeInMsec) {
      [minTimeInMsec, maxTimeInMsec] = [maxTimeInMsec, minTimeInMsec];
    }
    this.minTimeInMsec = minTimeInMsec;
    this.maxTimeInMsec = maxTimeInMsec;
    this.totalDurationMs = maxTimeInMsec - minTimeInMsec;

    const idealTimeStep = (maxTimeInMsec - minTimeInMsec) / 5;

    let bestTimeStep: keyof typeof timeSteps | null = null;
    let diff = Number.MAX_SAFE_INTEGER;

    for (const timeStep of Object.keys(timeSteps)) {
      const timeStepValue = timeSteps[timeStep as keyof typeof timeSteps];
      const delta = Math.abs(timeStepValue - idealTimeStep);
      if (delta < diff) {
        bestTimeStep = timeStep as keyof typeof timeSteps;
        diff = delta;
      }
    }
    if (!bestTimeStep) {
      throw new Error('No best time step found');
    }

    const mainTimeStepInMsec = timeSteps[bestTimeStep];

    const ticks: { dateTime: Date; label: string }[] = [];
    const tickTimesInMsec: number[] = [minTimeInMsec];

    // Ensure we always have a label at axis origin (X/Y intersection),
    // then add aligned ticks strictly within the axis end.
    const firstAlignedTickTimeInMsec =
      Math.ceil(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;

    let currentTimeInMsec = firstAlignedTickTimeInMsec;
    while (currentTimeInMsec <= maxTimeInMsec) {
      if (currentTimeInMsec > minTimeInMsec) {
        tickTimesInMsec.push(currentTimeInMsec);
      }
      currentTimeInMsec += mainTimeStepInMsec;
    }

    for (const tickTimeInMsec of tickTimesInMsec) {
      const dateTime = new Date(tickTimeInMsec);
      ticks.push({ dateTime, label: this.computeLabelForTick(dateTime) });
    }

    this.ticks = ticks;
  }

  public draw(): void {
    const width = this.app.screen.width;

    const xAxisStart = this.yAxis.getAxisStart();
    if (
      !xAxisStart ||
      typeof xAxisStart.x !== 'number' ||
      typeof xAxisStart.y !== 'number'
    ) {
      throw new Error('No x axis start found');
    }
    this.axisStart = xAxisStart as { x: number; y: number };

    const xAxisEnd = {
      x: width * 0.9,
      y: xAxisStart.y,
    };
    if (
      !xAxisEnd ||
      typeof xAxisEnd.x !== 'number' ||
      typeof xAxisEnd.y !== 'number'
    ) {
      throw new Error('No x axis end found');
    }
    this.axisEnd = xAxisEnd as { x: number; y: number };

    safeMoveTo(this.graphic, xAxisStart.x, xAxisStart.y);
    safeLineTo(this.graphic, xAxisEnd.x, xAxisEnd.y);

    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });

    this.graphic.stroke();

    safeMoveTo(this.graphic, xAxisEnd.x, xAxisEnd.y);
    safeLineTo(this.graphic, xAxisEnd.x - 10, xAxisEnd.y - 10);
    safeLineTo(this.graphic, xAxisEnd.x - 10, xAxisEnd.y + 10);
    safeLineTo(this.graphic, xAxisEnd.x, xAxisEnd.y);
    this.graphic.closePath();
    this.graphic.fill({ color: this.styleOptions.axis.color });

    const axisLengthInPixels = xAxisEnd.x - xAxisStart.x - 20;

    // Bug 3.3: Use stored min/max from setData (START/STOP bounds)
    this.axisStartTimeInMsec = this.minTimeInMsec;
    this.axisEndTimeInMsec = this.maxTimeInMsec;

    // Bug 3.8: Guard against zero or negative duration (avoids NaN/Infinity)
    let axisTimeLengthInMsec = this.maxTimeInMsec - this.minTimeInMsec;
    if (axisTimeLengthInMsec <= 0 || !Number.isFinite(axisTimeLengthInMsec)) {
      axisTimeLengthInMsec = 1; // 1ms minimum to avoid division by zero
    }

    const pixelsPerMsec = axisLengthInPixels / axisTimeLengthInMsec;
    this.pixelsPerMsec = Number.isFinite(pixelsPerMsec) ? pixelsPerMsec : 0;

    if (this.ticks.length === 0) {
      console.warn('No ticks generated for X axis');
      this.visible = true;
      this.alpha = 1;
      return;
    }

    const maxTickXPos = xAxisEnd.x - 20;
    for (const tick of this.ticks) {
      const tickTimeInMsec = new Date(tick.dateTime).getTime();
      const tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;

      // Bug 3.8: Skip invalid positions (NaN, Infinity)
      if (!Number.isFinite(tickXpos)) {
        continue;
      }

      // Keep ticks strictly within the visible X axis segment (before arrow tip).
      if (tickXpos < xAxisStart.x || tickXpos > maxTickXPos) {
        continue;
      }

      tick.pos = tickXpos;

      safeStrokeLine(
        this.graphic,
        tickXpos,
        xAxisStart.y - 10,
        tickXpos,
        xAxisStart.y + 10,
        {
          color: this.styleOptions.tick.color,
          width: this.styleOptions.tick.width,
        },
      );
    }

    this.visible = true;
    this.alpha = 1;
  }

  public getLabelDescriptors(): AxisLabelDescriptor[] {
    if (!this.axisStart) {
      return [];
    }

    const xAxisStart = this.axisStart;
    const xAxisEnd = this.axisEnd;
    const labelOffsetFromAxis = 12;
    const descriptors: AxisLabelDescriptor[] = [];

    for (const tick of this.ticks) {
      if (tick.pos === undefined || !tick.label) {
        continue;
      }

      const tickTimeInMsec = new Date(tick.dateTime).getTime();
      descriptors.push({
        id: `x-tick-${tickTimeInMsec}`,
        text: tick.label,
        worldX: tick.pos,
        worldY: xAxisStart.y + labelOffsetFromAxis,
        angleDeg: 45,
        anchorX: -0.05,
        anchorY: 0,
        fontSize: this.styleOptions.label.fontSize,
        fontFamily: this.styleOptions.label.fontFamily,
        fill: this.styleOptions.label.color,
        kind: 'x-tick',
        labelWidth: this.measureLabelWidth(tick.label),
      });
    }

    const formatMentionText = this.getFormatMentionText();
    if (formatMentionText && xAxisEnd) {
      const formatWidth = this.measureTextWidth(
        formatMentionText,
        this.styleOptions.formatMention.fontSize,
        this.styleOptions.formatMention.fontFamily,
        this.styleOptions.formatMention.fontStyle,
      );
      descriptors.push({
        id: 'format-mention',
        text: formatMentionText,
        worldX: xAxisEnd.x - 5,
        worldY: xAxisStart.y + labelOffsetFromAxis,
        angleDeg: 0,
        anchorX: 0.5,
        anchorY: 0,
        fontSize: this.styleOptions.formatMention.fontSize,
        fontFamily: this.styleOptions.formatMention.fontFamily,
        fill: this.styleOptions.formatMention.color,
        fontStyle: this.styleOptions.formatMention.fontStyle,
        kind: 'format-mention',
        labelWidth: formatWidth,
      });
    }

    return descriptors;
  }
}

