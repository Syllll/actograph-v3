import { IObservation } from '@services/observations/interface';
import { BaseGroup } from '../lib/base-group';
import { Application, Container, Text } from 'pixi.js';
import { BaseGraphic } from '../lib/base-graphic';
import { ProtocolItem, protocolService } from '@services/observations/protocol.service';

export class yAxis extends BaseGroup {
  private graphic: BaseGraphic;
  private labelsContainer: Container;
  private ticks: {
    label: string,
    pos?: number,
    category: ProtocolItem,
    observable: ProtocolItem,
  }[] = [];
  private categories: ProtocolItem[] = [];
  
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

  constructor(app: Application) {
    super(app);

    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);

    this.labelsContainer = new Container();
    this.addChild(this.labelsContainer);
  }

  public getPosFromLabel(label: string): number {
    for (const tick of this.ticks) {
      if (tick.label === label) {
        if (!tick.pos) {
          throw new Error(`Tick with label ${label} has no position`);
        }
        return tick.pos;
      }
    }

    throw new Error(`Tick with label ${label} not found`);
  }

  public setData(observation: IObservation) {
    super.setData(observation);

    // Get the protocol
    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }

    // Get the categories
    const categories = protocolService.parseProtocolItems(protocol);

    this.categories = categories;
  }

  public clear() {
    this.labelsContainer.removeChildren();

    this.ticks = [];
    this.axisStart = null;
    this.axisEnd = null;

    super.clear();
  }

  public draw(): void {
    // We know the axis must end 20px below the top of the screen
    // The start pos is determined by the number of obs and categories.

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    

    // Loop on all categories and observables to determine total height, 
    // and obs position
    let axisLength = 0;
    const ticks: {
      label: string,
      pos?: number,
      category: ProtocolItem,
      observable: ProtocolItem,
    }[] = [];
    for (const category of this.categories) {
      if (category.children) {
        // Loop on all observables
        for (const observable of category.children) {
          axisLength += 30;

          ticks.push({
            label: observable.name,
            pos: axisLength,
            category,
            observable,
          });
        }

        axisLength += 15;
      }
    }

    this.ticks = ticks;

    // Set the axis start and end
    const offset = {
      x: width * 0.2,
      y: 20,
    };

    // The y axis starts at 20px below the top of the screen
    const yAxisStart = {
      x: offset.x,
      y: axisLength + offset.y,
    };

    // The y axis ends at 20px from the left of the screen
    const yAxisEnd = {
      x: offset.x,
      y: offset.y,
    };

    this.axisStart = yAxisStart;
    this.axisEnd = yAxisEnd;

    // Draw the axis

    this.graphic.moveTo(yAxisStart.x, yAxisStart.y);
    this.graphic.lineTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.setStrokeStyle({
      color: this.styleOptions.axis.color,
      width: this.styleOptions.axis.width,
    });
    this.graphic.stroke();

    // Make an arrow at the end of the axis, a filled arrow
    this.graphic.moveTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.lineTo(yAxisEnd.x + 10, yAxisEnd.y + 10);
    this.graphic.lineTo(yAxisEnd.x - 10, yAxisEnd.y + 10);
    this.graphic.lineTo(yAxisEnd.x, yAxisEnd.y);
    this.graphic.closePath();
    this.graphic.fill({ color: this.styleOptions.axis.color });

    // Draw the ticks
    for (const tick of this.ticks) {
      if (!tick.pos) {
        throw new Error('Tick position is undefined');
      }

      const tickYPos = yAxisStart.y - tick.pos;
      tick.pos = tickYPos;

      this.graphic.moveTo(yAxisStart.x - 10, tickYPos);
      this.graphic.lineTo(yAxisStart.x + 10, tickYPos);
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
      label.x = yAxisStart.x - 12;
      label.y = tickYPos;
      label.anchor.set(1, 0.5);
      this.labelsContainer.addChild(label);
    }
  }
}