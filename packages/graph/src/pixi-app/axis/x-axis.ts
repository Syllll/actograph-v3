import { Application, Container, Text } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import type { IReading, IObservation } from '@actograph/core';
import { ObservationModeEnum, ReadingTypeEnum } from '@actograph/core';
import { YAxis } from './y-axis';
import {
  formatAxisLabel,
  formatChronoAxisLabel,
} from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';

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
  private graphic: BaseGraphic;
  private readings: IReading[] = [];
  private labelsContainer: Container;
  private yAxis: YAxis;
  private pixelsPerMsec = 0;
  private axisStartTimeInMsec = 0;
  private axisEndTimeInMsec = 0;
  /** Min/max timestamps from setData (START/STOP or sorted bounds) */
  private minTimeInMsec = 0;
  private maxTimeInMsec = 0;
  /** Total duration in ms for adaptive label formatting (Bug 3.9) */
  private totalDurationMs = 0;

  private styleOptions = {
    axis: { color: 'black', width: 2 },
    tick: { color: 'black', width: 1 },
    label: { color: 'black', fontSize: 12, fontFamily: 'Arial' },
  };

  private ticks: { dateTime: Date; label: string; pos?: number }[] = [];
  private axisStart: { x: number; y: number } | null = null;
  private axisEnd: { x: number; y: number } | null = null;

  public getAxisStart() {
    return { ...this.axisStart };
  }

  public getAxisEnd() {
    return { ...this.axisEnd };
  }

  constructor(app: Application, yAxis: YAxis) {
    super(app);
    this.yAxis = yAxis;
    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);
    this.labelsContainer = new Container();
    this.addChild(this.labelsContainer);
  }

  public getPosFromDateTime(dateTime: Date | string): number {
    const dateTimeInMsec = new Date(dateTime).getTime();
    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || !axisStart.x) {
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
    this.labelsContainer.removeChildren();
    this.ticks = [];
    this.pixelsPerMsec = 0;
    this.axisStartTimeInMsec = 0;
    this.axisEndTimeInMsec = 0;
    this.minTimeInMsec = 0;
    this.maxTimeInMsec = 0;
    this.totalDurationMs = 0;
    super.clear();
  }

  public setData(observation: IObservation) {
    super.setData(observation);

    const readings = observation.readings;
    if (!readings?.length) {
      throw new Error('No readings found');
    }

    this.readings = readings;

    // Bug 3.3: Use START and STOP readings for axis bounds (not array order)
    const sortedByTime = [...readings].sort((a, b) => {
      const ta = new Date(a.dateTime).getTime();
      const tb = new Date(b.dateTime).getTime();
      return ta - tb;
    });

    const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);

    let minTimeInMsec: number;
    let maxTimeInMsec: number;

    if (startReading && stopReading) {
      minTimeInMsec = new Date(startReading.dateTime).getTime();
      maxTimeInMsec = new Date(stopReading.dateTime).getTime();
    } else {
      // Fallback: use first and last by chronological order
      minTimeInMsec = new Date(sortedByTime[0]!.dateTime).getTime();
      maxTimeInMsec = new Date(sortedByTime[sortedByTime.length - 1]!.dateTime).getTime();
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

    // Bug 3.3: First tick at or after min (axis should not start at 0h00 when data starts at 6h06)
    const firstTickTimeInMsec =
      Math.ceil(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;

    let currentTimeInMsec = firstTickTimeInMsec;
    while (currentTimeInMsec <= maxTimeInMsec + mainTimeStepInMsec) {
      if (currentTimeInMsec >= minTimeInMsec) {
        const dateTime = new Date(currentTimeInMsec);

        let label: string;
        if (this.observation?.mode === ObservationModeEnum.Chronometer) {
          label = formatChronoAxisLabel(
            dateTime,
            CHRONOMETER_T0,
            this.totalDurationMs
          );
        } else {
          label = formatAxisLabel(dateTime, this.totalDurationMs);
        }

        ticks.push({ dateTime, label });
      }

      currentTimeInMsec += mainTimeStepInMsec;
    }

    this.ticks = ticks;
  }

  public draw(): void {
    this.graphic.clear();
    this.graphic.x = 0;
    this.graphic.y = 0;
    this.labelsContainer.removeChildren();
    this.labelsContainer.x = 0;
    this.labelsContainer.y = 0;

    this.x = 0;
    this.y = 0;
    this.scale.set(1);
    this.rotation = 0;

    const width = this.app.screen.width;

    const xAxisStart = this.yAxis.getAxisStart();
    if (!xAxisStart || !xAxisStart.x || !xAxisStart.y) {
      throw new Error('No x axis start found');
    }
    this.axisStart = xAxisStart as { x: number; y: number };

    const xAxisEnd = {
      x: width * 0.9,
      y: xAxisStart.y,
    };
    if (!xAxisEnd || !xAxisEnd.x || !xAxisEnd.y) {
      throw new Error('No x axis end found');
    }
    this.axisEnd = xAxisEnd as { x: number; y: number };

    this.graphic.moveTo(xAxisStart.x, xAxisStart.y);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);

    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });

    this.graphic.stroke();

    this.graphic.moveTo(xAxisEnd.x, xAxisEnd.y);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 10);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 10);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
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

    for (const tick of this.ticks) {
      const tickTimeInMsec = new Date(tick.dateTime).getTime();
      let tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;

      // Bug 3.8: Skip invalid positions (NaN, Infinity)
      if (!Number.isFinite(tickXpos)) {
        continue;
      }

      tick.pos = tickXpos;

      this.graphic.moveTo(tickXpos, xAxisStart.y - 10);
      this.graphic.lineTo(tickXpos, xAxisStart.y + 10);
      this.graphic.setStrokeStyle({
        color: this.styleOptions.tick.color,
        width: this.styleOptions.tick.width,
      });
      this.graphic.stroke();

      const label = new Text({
        text: tick.label,
        style: {
          fontSize: this.styleOptions.label.fontSize,
          fill: this.styleOptions.label.color,
          fontFamily: this.styleOptions.label.fontFamily,
        },
      });
      label.x = tickXpos;
      label.y = xAxisStart.y + 12;
      label.anchor.set(-0.05, 0);
      label.angle = 45;
      label.visible = true;
      label.alpha = 1;
      this.labelsContainer.addChild(label);
    }

    this.labelsContainer.visible = true;
    this.labelsContainer.alpha = 1;
    this.visible = true;
    this.alpha = 1;
  }
}

