import { Application, Container, Graphics, Text } from 'pixi.js'
import { BaseGroup } from '../lib/base-group';
import { BaseGraphic } from '../lib/base-graphic';
import { IReading, IObservation } from '@services/observations/interface';
import { yAxis } from './y-axis';

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
}

export class xAxis extends BaseGroup {
  private graphic: BaseGraphic;
  private readings: IReading[] = [];
  private labelsContainer: Container;
  private yAxis: yAxis;
  private pixelsPerMsec = 0;
  private axisStartTimeInMsec = 0;
  private axisEndTimeInMsec = 0;

  private styleOptions = {
    axis: {
      color: 'black',
      width: 2,
    },
    tick: {
      color: 'black',
      width: 1,
    },
    label: {
      color: 'black',
      fontSize: 12,
      fontFamily: 'Arial',
    },
  }

  private ticks: {
    dateTime: Date,
    label: string,
    pos?: number,
  }[] = [];

  private axisStart: {
    x: number,
    y: number,
  } | null = null;

  private axisEnd: {
    x: number,
    y: number,
  } | null = null;

  public getAxisStart() {
    return { ...this.axisStart };
  }
  public getAxisEnd() {
    return { ...this.axisEnd };
  }
    
  constructor(app: Application, yAxis: yAxis) {
    super(app);

    this.yAxis = yAxis;

    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);

    this.labelsContainer = new Container();
    this.addChild(this.labelsContainer);

    // this.draw();
  }

  public getPosFromDateTime(dateTime: Date | string): number {
    const dateTimeInMsec = new Date(dateTime).getTime();

    const axisStart = this.yAxis.getAxisStart();
    if (!axisStart || !axisStart.x) {
      throw new Error('No axis start found');
    }

    // Get start time of axis
    const pos = axisStart.x + (dateTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;

    return pos;
  }

  public clear() {
    this.labelsContainer.removeChildren();

    this.ticks = [];
    this.pixelsPerMsec = 0;

    super.clear();
  }

  public setData(observation: IObservation) {
    super.setData(observation);

    // Get the readings
    const readings = observation.readings;
    if (!readings?.length) {
      throw new Error('No readings found');
    }

    this.readings = readings;

    // Get the min and max reading
    const minReading = readings[0];
    const maxReading = readings[readings.length - 1];

    // Get the min and max timestamp
    const minTimeInMsec = new Date(minReading.dateTime).getTime();
    const maxTimeInMsec = new Date(maxReading.dateTime).getTime();

    // Now, we want about 5 main ticks on the axis
    // We need to determine what is the best timesteps to use

    const idealTimeStep = (maxTimeInMsec - minTimeInMsec) / 5;

    // Find the best time step that is closest to the ideal time step
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

    // Now, we have the best main time step
    const mainTimeStepInMsec = timeSteps[bestTimeStep];

    const ticks: {
      dateTime: Date,
      label: string,
    }[] = [];

    // We want to start the axis at the first reading but we need place the ticks
    // intelligently. For example, if the first reading is at 00:00:11.000 and the main time step is 10 seconds,
    // we want to start the axis at 00:00:10.000.
    // and then to have a main tick every 10 seconds.

    // Use round to find the first tick
    const firstTickTimeInMsec = Math.round(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;
    //const firstTickDate = new Date(firstTickTimeInMsec);

    // Now, we want to have a tick every mainTimeStepInMsec until we reach the maxTimeInMsec
    let currentTimeInMsec = firstTickTimeInMsec;
    while (currentTimeInMsec <= (maxTimeInMsec + mainTimeStepInMsec)) {
      if (currentTimeInMsec >= minTimeInMsec) {
        const dateTime = new Date(currentTimeInMsec);
        ticks.push({ 
          dateTime,
          // Label must be in the format dd/MM/yyyy HH:mm:ss.xxx
          label: dateTime.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
          }).replace(/\//g, '-'),
        });
      }

      currentTimeInMsec += mainTimeStepInMsec;
    }

    this.ticks = ticks;
    //console.log('computed ticks', this.ticks);
  }

  public draw(): void {
    //console.log('draw')

    // Clear the primitive
    this.graphic.clear();
    

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // The x axis starts at 80% of the screen height
    // and 20% of the screen width
    const xAxisStart = this.yAxis.getAxisStart();
    if (!xAxisStart || !xAxisStart.x || !xAxisStart.y) {
      throw new Error('No x axis start found');
    }
    this.axisStart = xAxisStart as {x: number, y: number};

    // The x axis ends at 80% of the screen width
    const xAxisEnd = {
      x: width * 0.9,
      y: this.yAxis.getAxisStart().y,
    };
    if (!xAxisEnd || !xAxisEnd.x || !xAxisEnd.y) {
      throw new Error('No x axis end found');
    }
    this.axisEnd = xAxisEnd  as {x: number, y: number};

    // Draw the axis
    this.graphic.moveTo(xAxisStart.x, xAxisStart.y);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);

    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });

    this.graphic.stroke();

    // Make an arrow at the end of the axis, a filled arrow
    this.graphic.moveTo(xAxisEnd.x, xAxisEnd.y);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 10);
    this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 10);
    this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
    this.graphic.closePath();
    this.graphic.fill({ color: this.styleOptions.axis.color });

    // Draw the ticks
    const axisLengthInPixels = (xAxisEnd.x - xAxisStart.x) - 20; // 10% of the axis width is reserved for the arrow
    const startReading = this.readings[0];
    const endTickTimeInMsecs = new Date(this.ticks[this.ticks.length - 1].dateTime).getTime();
    
    const startTimeInMsecs = new Date(startReading.dateTime).getTime();
    const endTimeInMsecs = endTickTimeInMsecs;
    this.axisStartTimeInMsec = startTimeInMsecs;
    this.axisEndTimeInMsec = endTimeInMsecs;
    
    const axisTimeLengthInMsec = endTimeInMsecs - startTimeInMsecs;

    // pixels per msecs
    const pixelsPerMsec = axisLengthInPixels / axisTimeLengthInMsec;
    this.pixelsPerMsec = pixelsPerMsec;

    for (const tick of this.ticks) {
      
      const tickTimeInMsec = new Date(tick.dateTime).getTime();
      const tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * pixelsPerMsec;
      
      // Set the position
      tick.pos = tickXpos;

      this.graphic.moveTo(tickXpos, xAxisStart.y - 10);
      this.graphic.lineTo(tickXpos, xAxisStart.y + 10);
      this.graphic.setStrokeStyle({
        color: this.styleOptions.tick.color,
        width: this.styleOptions.tick.width,
      });
      this.graphic.stroke();

      // Draw the label
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
      this.labelsContainer.addChild(label);
    }
  }
}