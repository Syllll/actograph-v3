import { Application, Text } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import type { IObservation, IProtocolItem } from '@actograph/core';
import { DisplayModeEnum } from '@actograph/core';
import { parseProtocolItems, ProtocolItem } from '../../utils/protocol.utils';

// ============================================================================
// Constants
// ============================================================================

const AXIS_CONFIG = {
  OFFSET_X: 150,
  OFFSET_Y: 20,
  LINE_WIDTH: 2,
  COLOR: 'black',
} as const;

const TICK_CONFIG = {
  OBSERVABLE_HEIGHT: 30,
  FRIEZE_HEIGHT: 40,
  CATEGORY_SPACING: 15,
  TICK_LENGTH: 10,
  FRIEZE_TICK_LENGTH: 5,
  TICK_WIDTH: 1,
  COLOR: 'black',
} as const;

const LABEL_CONFIG = {
  OFFSET: 12,
  FONT_SIZE: 12,
  FONT_FAMILY: 'Arial',
  COLOR: 'black',
} as const;

const ARROW_CONFIG = {
  SIZE: 10,
} as const;

// ============================================================================
// Types
// ============================================================================

interface ITick {
  label: string;
  pos?: number;
  category: ProtocolItem;
  observable: ProtocolItem;
  isFrieze?: boolean;
  friezeHeight?: number;
  friezeStartY?: number;
  friezeEndY?: number;
}

interface IPosition {
  x: number;
  y: number;
}

// ============================================================================
// Class
// ============================================================================

export class YAxis extends BaseGroup {
  private readonly graphic: BaseGraphic;
  private ticks: ITick[] = [];
  private categories: ProtocolItem[] = [];
  private axisStart: IPosition | null = null;
  private axisEnd: IPosition | null = null;

  constructor(app: Application) {
    super(app);
    this.graphic = new BaseGraphic(this.app);
    this.addChild(this.graphic);
  }

  public getAxisStart(): IPosition | null {
    return this.axisStart ? { ...this.axisStart } : null;
  }

  public getAxisEnd(): IPosition | null {
    return this.axisEnd ? { ...this.axisEnd } : null;
  }

  public getPosFromLabel(label: string): number {
    for (const tick of this.ticks) {
      if (tick.label === label) {
        this.assertTickHasPosition(tick);
        return tick.pos;
      }

      if (tick.isFrieze && tick.category.children) {
        const observable = tick.category.children.find((o: IProtocolItem) => o.name === label);
        if (observable) {
          this.assertTickHasPosition(tick);
          return tick.pos;
        }
      }
    }

    return -1;
  }

  public getFriezeInfo(categoryId: string): {
    centerY: number;
    startY: number;
    endY: number;
    height: number;
  } | null {
    const tick = this.ticks.find(
      (t) => t.isFrieze && t.category.id === categoryId
    );

    if (!tick?.isFrieze || tick.pos === undefined || tick.friezeStartY === undefined ||
        tick.friezeHeight === undefined || tick.friezeEndY === undefined) {
      return null;
    }

    return {
      centerY: tick.pos,
      startY: tick.friezeStartY,
      endY: tick.friezeEndY,
      height: tick.friezeHeight,
    };
  }

  public isCategoryBackground(categoryId: string): boolean {
    const category = this.categories.find((c) => c.id === categoryId);
    return category?.graphPreferences?.displayMode === DisplayModeEnum.Background;
  }

  public isCategoryFrieze(categoryId: string): boolean {
    const category = this.categories.find((c) => c.id === categoryId);
    return category?.graphPreferences?.displayMode === DisplayModeEnum.Frieze;
  }

  public getRequiredHeight(): number {
    const { axisLength } = this.computeAxisLengthAndTicks();
    const extraMargin = 20;
    return axisLength + AXIS_CONFIG.OFFSET_Y + extraMargin;
  }

  public setData(observation: IObservation): void {
    super.setData(observation);

    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }

    // Utilise _items en priorité (format frontend) ou items (format mobile/core)
    const prot = protocol as any;
    const items = prot._items || prot.items;
    this.categories = items?.length
      ? items
      : parseProtocolItems(protocol);
  }

  public setProtocol(protocol: { items?: IProtocolItem[] }): void {
    // Utilise _items en priorité (format frontend) ou items (format mobile/core)
    const prot = protocol as any;
    const items = prot._items || prot.items;
    if (items?.length) {
      this.categories = items;
    }
  }

  public clear(): void {
    this.removeLabels();
    this.graphic.clear();
    this.ticks = [];
    this.axisStart = null;
    this.axisEnd = null;
    super.clear();
  }

  public draw(): void {
    this.prepareForDraw();

    const { axisLength, ticks } = this.computeAxisLengthAndTicks();

    const yAxisStart: IPosition = {
      x: AXIS_CONFIG.OFFSET_X,
      y: axisLength + AXIS_CONFIG.OFFSET_Y,
    };
    const yAxisEnd: IPosition = {
      x: AXIS_CONFIG.OFFSET_X,
      y: AXIS_CONFIG.OFFSET_Y,
    };

    this.axisStart = yAxisStart;
    this.axisEnd = yAxisEnd;

    this.ticks = this.convertTicksToAbsolutePositions(ticks, yAxisStart);

    this.drawAxisLine(yAxisStart, yAxisEnd);
    this.drawArrow(yAxisEnd);
    this.drawTicks(yAxisStart);

    this.visible = true;
    this.alpha = 1;
  }

  private prepareForDraw(): void {
    this.graphic.clear();
    this.graphic.x = 0;
    this.graphic.y = 0;
    this.removeLabels();
    this.x = 0;
    this.y = 0;
    this.scale.set(1);
    this.rotation = 0;
    this.ticks = [];
  }

  private drawAxisLine(start: IPosition, end: IPosition): void {
    this.graphic.moveTo(start.x, start.y);
    this.graphic.lineTo(end.x, end.y);
    this.graphic.setStrokeStyle({
      color: AXIS_CONFIG.COLOR,
      width: AXIS_CONFIG.LINE_WIDTH,
    });
    this.graphic.stroke();
  }

  private drawArrow(position: IPosition): void {
    const size = ARROW_CONFIG.SIZE;
    this.graphic.moveTo(position.x, position.y);
    this.graphic.lineTo(position.x + size, position.y + size);
    this.graphic.lineTo(position.x - size, position.y + size);
    this.graphic.lineTo(position.x, position.y);
    this.graphic.closePath();
    this.graphic.fill({ color: AXIS_CONFIG.COLOR });
  }

  private drawTicks(axisStart: IPosition): void {
    for (const tick of this.ticks) {
      this.assertTickHasPosition(tick);
      const tickYPos = tick.pos;

      if (tick.isFrieze) {
        this.drawFriezeTick(axisStart.x, tickYPos, tick.label);
      } else {
        this.drawNormalTick(axisStart.x, tickYPos, tick.label);
      }
    }
  }

  private drawNormalTick(axisX: number, tickY: number, label: string): void {
    this.graphic.moveTo(axisX - TICK_CONFIG.TICK_LENGTH, tickY);
    this.graphic.lineTo(axisX + TICK_CONFIG.TICK_LENGTH, tickY);
    this.graphic.setStrokeStyle({
      color: TICK_CONFIG.COLOR,
      width: TICK_CONFIG.TICK_WIDTH,
    });
    this.graphic.stroke();

    this.createLabel(label, axisX - LABEL_CONFIG.OFFSET, tickY, false);
  }

  private drawFriezeTick(axisX: number, tickY: number, label: string): void {
    this.graphic.moveTo(axisX - TICK_CONFIG.FRIEZE_TICK_LENGTH, tickY);
    this.graphic.lineTo(axisX + TICK_CONFIG.FRIEZE_TICK_LENGTH, tickY);
    this.graphic.setStrokeStyle({
      color: TICK_CONFIG.COLOR,
      width: TICK_CONFIG.TICK_WIDTH,
    });
    this.graphic.stroke();

    this.createLabel(label, axisX - LABEL_CONFIG.OFFSET, tickY, true);
  }

  private createLabel(text: string, x: number, y: number, bold: boolean): Text {
    const label = new Text({
      text,
      style: {
        fontSize: LABEL_CONFIG.FONT_SIZE,
        fill: LABEL_CONFIG.COLOR,
        fontFamily: LABEL_CONFIG.FONT_FAMILY,
        fontWeight: bold ? 'bold' : 'normal',
      },
    });
    label.x = x;
    label.y = y;
    label.anchor.set(1, 0.5);
    label.visible = true;
    label.alpha = 1;
    this.addChild(label);
    return label;
  }

  private removeLabels(): void {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child !== this.graphic) {
        this.removeChild(child);
      }
    }
  }

  private computeAxisLengthAndTicks(): { axisLength: number; ticks: ITick[] } {
    let axisLength = 0;
    const ticks: ITick[] = [];

    for (const category of this.categories) {
      const displayMode = category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;

      if (displayMode === DisplayModeEnum.Background) {
        continue;
      }

      if (!category.children) {
        continue;
      }

      if (displayMode === DisplayModeEnum.Frieze) {
        const friezeStartY = axisLength;
        axisLength += TICK_CONFIG.FRIEZE_HEIGHT;

        ticks.push({
          label: category.name,
          pos: friezeStartY + TICK_CONFIG.FRIEZE_HEIGHT / 2,
          category,
          observable: category,
          isFrieze: true,
          friezeHeight: TICK_CONFIG.FRIEZE_HEIGHT,
          friezeStartY,
        });
      } else {
        for (const observable of category.children) {
          axisLength += TICK_CONFIG.OBSERVABLE_HEIGHT;
          ticks.push({
            label: observable.name,
            pos: axisLength,
            category,
            observable,
          });
        }
      }

      axisLength += TICK_CONFIG.CATEGORY_SPACING;
    }

    return { axisLength, ticks };
  }

  private convertTicksToAbsolutePositions(ticks: ITick[], axisStart: IPosition): ITick[] {
    return ticks.map((tick) => {
      this.assertTickHasPosition(tick);

      const absolutePos = axisStart.y - tick.pos;

      let friezeStartY = tick.friezeStartY;
      let friezeEndY = tick.friezeEndY;

      if (tick.isFrieze && tick.friezeStartY !== undefined && tick.friezeHeight !== undefined) {
        const absoluteFriezeBottomY = axisStart.y - tick.friezeStartY;
        const absoluteFriezeTopY = absoluteFriezeBottomY - tick.friezeHeight;
        friezeStartY = absoluteFriezeBottomY;
        friezeEndY = absoluteFriezeTopY;
      }

      return {
        ...tick,
        pos: absolutePos,
        friezeStartY,
        friezeEndY,
      };
    });
  }

  private assertTickHasPosition(tick: ITick): asserts tick is ITick & { pos: number } {
    if (tick.pos === undefined || tick.pos === null) {
      throw new Error(`Tick with label "${tick.label}" has no position`);
    }
  }
}

