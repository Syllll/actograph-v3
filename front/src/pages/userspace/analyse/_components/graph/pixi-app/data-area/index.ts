import { Application, Rectangle } from 'pixi.js';
import { BaseGroup } from '../lib/base-group';
import {
  IReading,
  IObservation,
  ReadingTypeEnum,
} from '@services/observations/interface';
import { yAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import {
  ProtocolItem,
  protocolService,
} from '@services/observations/protocol.service';
import { BaseGraphic } from '../lib/base-graphic';

export class DataArea extends BaseGroup {
  private yAxis: yAxis;
  private xAxis: xAxis;
  private readingsPerCategory: {
    category: ProtocolItem;
    readings: IReading[];
  }[] = [];

  private graphicPerCategory: {
    category: ProtocolItem;
    graphic: BaseGraphic;
  }[] = [];

  private graphicForBackground: BaseGraphic;

  private pointerDashedLines: BaseGraphic;

  constructor(app: Application, yAxis: yAxis, xAxis: xAxis) {
    super(app);

    this.yAxis = yAxis;
    this.xAxis = xAxis;

    this.graphicForBackground = new BaseGraphic(app);
    this.addChild(this.graphicForBackground);

    this.pointerDashedLines = new BaseGraphic(app);
    this.addChild(this.pointerDashedLines);
  }

  public init() {
    super.init();

    // only children have events
    this.eventMode = 'passive';

    this.graphicForBackground.eventMode = 'static';
    this.graphicForBackground.on('pointermove', (evt) => {
      const origin = this.yAxis.getAxisStart();
      if (!origin) {
        throw new Error('No origin');
      }

      // both points in pointerDashedLines local space
      const p = evt.getLocalPosition(this.pointerDashedLines);
      const originLocal = this.pointerDashedLines.toLocal(origin as any);

      this.pointerDashedLines.clear();

      this.pointerDashedLines
        .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
        .moveTo(p.x, p.y)
        .dashedLineTo(p.x, originLocal.y)
        .stroke();
    
      // A dashed line from the y axis to the pointer event point
      this.pointerDashedLines
        .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
        .moveTo(p.x, p.y)
        .dashedLineTo(originLocal.x, p.y)
        .stroke();
    })
    this.graphicForBackground.on('pointerleave', (evt) => {
      this.pointerDashedLines.clear();
    })
  }

  public setData(observation: IObservation) {
    super.setData(observation);

    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }
    const categories = protocolService.parseProtocolItems(protocol);

    this.readingsPerCategory = [];
    // Fill with categories
    for (const category of categories) {
      this.readingsPerCategory.push({
        category,
        readings: [],
      });
    }

    const readings = observation.readings;
    if (!readings?.length) {
      throw new Error('No readings found');
    }

    // Loop on all readings and group them by category
    for (const reading of readings) {
      if (reading.type === ReadingTypeEnum.DATA) {
        const obsName = reading.name;

        // Find the category that contains an observable with the same name
        const categoryEntry = this.readingsPerCategory.find((r) =>
          r.category.children?.some((o) => o.name === obsName)
        );
        if (!categoryEntry) {
          console.warn(`Category not found for observable ${obsName}`);
          continue;
        }

        // Add the reading to the category
        categoryEntry.readings.push(reading);
      }
    }

    // For all category entries, add the stop reading
    const lastReading = readings[readings.length - 1];
    if (lastReading.type === ReadingTypeEnum.STOP) {
      for (const categoryEntry of this.readingsPerCategory) {
        categoryEntry.readings.push(lastReading);
      }
    }
    
  }

  public clear() {
    super.clear();

    this.graphicForBackground.clear();
    this.pointerDashedLines.clear();

    this.readingsPerCategory = [];

    for (const graphicEntry of this.graphicPerCategory) {
      graphicEntry.graphic.clear();
    }
  }

  public draw(): void {
    // Draw a white background
    // Get the origin point which is the start of the y axis
    // yhe bottom left
    const bottomLeft = this.yAxis.getAxisStart() as {x: number, y: number};
    // Get the top right
    const topRight = {
      x: this.xAxis.getAxisEnd().x,
      y: this.yAxis.getAxisEnd().y,
    }  as {x: number, y: number};
    // Draw a rectangle
    this.graphicForBackground.rect(bottomLeft.x, topRight.y, topRight.x - bottomLeft.x, Math.abs(topRight.y - bottomLeft.y));
    this.graphicForBackground.fill({
      color: 'transparent',
    })

    // Draw the categories
    for (const categoryEntry of this.readingsPerCategory) {
      this.drawCategory(categoryEntry);
    }
  }

  private drawCategory(categoryEntry: {
    category: ProtocolItem;
    readings: IReading[];
  }) {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;

    // do we have a graphic for this category ?
    let graphicEntry = this.graphicPerCategory.find(
      (g) => g.category.id === category.id
    );
    if (!graphicEntry) {
      const graphic = new BaseGraphic(this.app);
      this.addChild(graphic);
      (<any>graphic).__catId = category.id;
      this.graphicPerCategory.push({
        category,
        graphic,
      });
    }
    graphicEntry = this.graphicPerCategory.find(
      (g) => g.category.id === category.id
    );
    if (!graphicEntry) {
      throw new Error('Graphic not found for category');
    }

    const graphic = graphicEntry.graphic;

    const firstReading = readings[0];
    if (!firstReading) {
      throw new Error('No readings found');
    }

    const start = {
      x: this.yAxis?.getAxisStart()?.x ?? 0,
      y: this.yAxis.getPosFromLabel(firstReading.name),
    };
    console.log(categoryEntry, start);

    graphic.moveTo(start.x, start.y);
    const last = {
      x: start.x,
      y: start.y,
    };

    for (let i = 1; i < readings.length; i++) {
      const reading = readings[i];
      if (!reading) {
        throw new Error('No reading found');
      }

      const yPos =
        reading.type === ReadingTypeEnum.STOP
          ? -1
          : this.yAxis.getPosFromLabel(reading.name);
      const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
      console.log('reading', reading.dateTime);
      // Draw to the right a line
      graphic.lineTo(xPos, last.y);
      graphic.setStrokeStyle({
        color: 'green',
        width: 2,
      });
      graphic.stroke();

      // Draw up or down to the yPos

      if (yPos >= 0) {
        graphic.lineTo(xPos, yPos);
        graphic.setStrokeStyle({
          color: 'grey',
          width: 1,
        });
        graphic.stroke();
      }

      last.x = xPos;
      last.y = yPos;
    }
  }
}
