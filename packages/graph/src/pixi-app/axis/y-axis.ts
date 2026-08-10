import { Application } from 'pixi.js';
import type { AxisLabelDescriptor } from '../../layers/AxisLabelOverlay';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import type { IObservation, IProtocolItem } from '@actograph/core';
import { DisplayModeEnum, ProtocolItemActionEnum, isCategoryVisible } from '@actograph/core';
import { parseProtocolItems, ProtocolItem } from '../../utils/protocol.utils';
import { safeMoveTo, safeLineTo, safeStrokeLine } from '../../utils/safe-graphics.utils';

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
  private displayGraphic: BaseGraphic;
  private paintGraphic: BaseGraphic;
  /** Cible de dessin courante (paint buffer pendant beginPaint…commitPaint). */
  private graphic: BaseGraphic;
  private ticks: ITick[] = [];
  private categories: ProtocolItem[] = [];
  private axisStart: IPosition | null = null;
  private axisEnd: IPosition | null = null;
  /**
   * Étirement par axe courant (voir PixiApp.axisStretch). Utilisé pour les
   * marques de tick et la hauteur des frises en espace monde, pas pour les
   * labels (screen-space via AxisLabelOverlay).
   */
  private axisStretch = { x: 1, y: 1 };

  constructor(app: Application) {
    super(app);
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
    this.ticks = [];
  }

  public commitPaint(): void {
    this.displayGraphic.visible = false;
    this.paintGraphic.visible = true;

    const previousDisplay = this.displayGraphic;
    this.displayGraphic = this.paintGraphic;
    this.paintGraphic = previousDisplay;

    this.paintGraphic.visible = false;
    this.paintGraphic.clear();
    this.graphic = this.displayGraphic;
  }

  public setAxisStretch(stretch: { x: number; y: number }): void {
    this.axisStretch = stretch;
  }

  public getAxisStart(): IPosition | null {
    return this.axisStart ? { ...this.axisStart } : null;
  }

  public getAxisEnd(): IPosition | null {
    return this.axisEnd ? { ...this.axisEnd } : null;
  }

  /**
   * True when axis endpoints are set and stroke geometry or tick labels are
   * present. Used by hover to detect a cleared axis still referenced by stale
   * plot bounds (a stale framebuffer can hide the mismatch until hover).
   */
  public hasDrawnContent(): boolean {
    if (!this.axisStart) {
      return false;
    }
    const bounds = this.displayGraphic.getLocalBounds();
    return bounds.width > 0 || bounds.height > 0;
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

  public getPosFromCategoryObservable(categoryId: string, observableName: string): number {
    for (const tick of this.ticks) {
      if (tick.category.id !== categoryId) {
        continue;
      }

      if (tick.isFrieze) {
        if (
          tick.category.children?.some(
            (o: IProtocolItem) => o.type === 'observable' && o.name === observableName,
          )
        ) {
          this.assertTickHasPosition(tick);
          return tick.pos;
        }
        continue;
      }

      if (
        tick.observable.type === 'observable' &&
        tick.observable.name === observableName
      ) {
        this.assertTickHasPosition(tick);
        return tick.pos;
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
    if (!category) return false;
    return this.getEffectiveDisplayMode(category) === DisplayModeEnum.Background;
  }

  public isCategoryFrieze(categoryId: string): boolean {
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) return false;
    return this.getEffectiveDisplayMode(category) === DisplayModeEnum.Frieze;
  }

  public getRequiredHeight(): number {
    const { axisLength } = this.computeAxisLengthAndTicks();
    const extraMargin = 20;
    return axisLength + AXIS_CONFIG.OFFSET_Y + extraMargin;
  }

  /**
   * Position Y de la ligne d'axe X (bas de la liste des catégories), sans
   * nécessiter un appel préalable à draw(). Utilisé par PixiApp pour calculer
   * la hauteur totale requise en tenant compte de la marge réelle des labels
   * d'axe X (voir xAxis.getRequiredBottomMargin()).
   */
  public getAxisStartY(): number {
    const { axisLength } = this.computeAxisLengthAndTicks();
    return axisLength + AXIS_CONFIG.OFFSET_Y;
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
    this.displayGraphic.clear();
    this.paintGraphic.clear();
    this.ticks = [];
    this.axisStart = null;
    this.axisEnd = null;
    super.clear();
  }

  public draw(): void {
    const { axisLength, ticks } = this.computeAxisLengthAndTicks();
    const axisOffsetX = this.computeAxisOffsetX(ticks);

    const yAxisStart: IPosition = {
      x: axisOffsetX,
      y: axisLength + AXIS_CONFIG.OFFSET_Y,
    };
    const yAxisEnd: IPosition = {
      x: axisOffsetX,
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

  /**
   * On mobile screens, a fixed 150px left offset wastes horizontal space when labels are short.
   * Estimate the needed label width and keep the offset adaptive, while preserving legacy spacing
   * on larger viewports.
   */
  private computeAxisOffsetX(ticks: ITick[]): number {
    const screenWidth = this.app.screen.width;
    const longestLabelLength = ticks.reduce((max, tick) => {
      return Math.max(max, tick.label.length);
    }, 0);

    const estimatedLabelWidth = Math.min(
      longestLabelLength * LABEL_CONFIG.FONT_SIZE * 0.58,
      screenWidth * 0.35
    );

    const minOffset = 80;
    const maxOffset = AXIS_CONFIG.OFFSET_X;
    const estimatedOffset = Math.ceil(
      estimatedLabelWidth + LABEL_CONFIG.OFFSET + TICK_CONFIG.TICK_LENGTH + 6
    );

    return Math.max(minOffset, Math.min(maxOffset, estimatedOffset));
  }

  private drawAxisLine(start: IPosition, end: IPosition): void {
    safeMoveTo(this.graphic, start.x, start.y);
    safeLineTo(this.graphic, end.x, end.y);
    this.graphic.setStrokeStyle({
      color: AXIS_CONFIG.COLOR,
      width: AXIS_CONFIG.LINE_WIDTH,
    });
    this.graphic.stroke();
  }

  private drawArrow(position: IPosition): void {
    const size = ARROW_CONFIG.SIZE;
    safeMoveTo(this.graphic, position.x, position.y);
    safeLineTo(this.graphic, position.x + size, position.y + size);
    safeLineTo(this.graphic, position.x - size, position.y + size);
    safeLineTo(this.graphic, position.x, position.y);
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

  private drawNormalTick(axisX: number, tickY: number, _label: string): void {
    // Contre-scale l'étirement horizontal (temps) : une graduation est une
    // marque de repère fixe, elle ne doit pas s'allonger/raccourcir quand
    // l'utilisatrice étire l'axe du temps (voir PixiApp.axisStretch).
    const tickLength = TICK_CONFIG.TICK_LENGTH / this.axisStretch.x;
    safeStrokeLine(
      this.graphic,
      axisX - tickLength,
      tickY,
      axisX + tickLength,
      tickY,
      {
        color: TICK_CONFIG.COLOR,
        width: TICK_CONFIG.TICK_WIDTH,
      },
    );

  }

  private drawFriezeTick(axisX: number, tickY: number, _label: string): void {
    const tickLength = TICK_CONFIG.FRIEZE_TICK_LENGTH / this.axisStretch.x;
    safeStrokeLine(
      this.graphic,
      axisX - tickLength,
      tickY,
      axisX + tickLength,
      tickY,
      {
        color: TICK_CONFIG.COLOR,
        width: TICK_CONFIG.TICK_WIDTH,
      },
    );

  }

  public getLabelDescriptors(): AxisLabelDescriptor[] {
    if (!this.axisStart) {
      return [];
    }

    const axisX = this.axisStart.x;
    const descriptors: AxisLabelDescriptor[] = [];

    for (const tick of this.ticks) {
      if (tick.pos === undefined) {
        continue;
      }

      descriptors.push({
        id: `y-tick-${tick.category.id}-${tick.label}`,
        text: tick.label,
        worldX: axisX - LABEL_CONFIG.OFFSET,
        worldY: tick.pos,
        angleDeg: 0,
        anchorX: 1,
        anchorY: 0.5,
        fontSize: LABEL_CONFIG.FONT_SIZE,
        fontFamily: LABEL_CONFIG.FONT_FAMILY,
        fill: LABEL_CONFIG.COLOR,
        fontWeight: tick.isFrieze ? 'bold' : 'normal',
        kind: 'y-tick',
      });
    }

    return descriptors;
  }

  private computeAxisLengthAndTicks(): { axisLength: number; ticks: ITick[] } {
    let axisLength = 0;
    const ticks: ITick[] = [];

    // Reverse categories and children so protocol order (top-to-bottom) maps to
    // graph Y axis (top-to-bottom). Without reversal the first category ends up
    // at the bottom because Y positions grow downward on screen but the axis
    // draws from bottom (large Y) to top (small Y).
    const reversedCategories = [...this.categories].reverse();

    for (const category of reversedCategories) {
      if (!isCategoryVisible(category)) {
        continue;
      }

      const displayMode = this.getEffectiveDisplayMode(category);

      if (displayMode === DisplayModeEnum.Background) {
        continue;
      }

      if (!category.children) {
        continue;
      }

      if (displayMode === DisplayModeEnum.Frieze) {
        // Contre-scale la compaction verticale : une frise garde une hauteur
        // affichée fixe même quand l'utilisatrice compacte l'axe Y (voir
        // PixiApp.axisStretch), contrairement aux lignes d'observables
        // normales qui doivent se compacter.
        const worldFriezeHeight = TICK_CONFIG.FRIEZE_HEIGHT / this.axisStretch.y;
        const friezeStartY = axisLength;
        axisLength += worldFriezeHeight;

        ticks.push({
          label: category.name,
          pos: friezeStartY + worldFriezeHeight / 2,
          category,
          observable: category,
          isFrieze: true,
          friezeHeight: worldFriezeHeight,
          friezeStartY,
        });
      } else {
        const reversedChildren = [...category.children].reverse();
        for (const observable of reversedChildren) {
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

  private getEffectiveDisplayMode(category: ProtocolItem): DisplayModeEnum {
    // Discrete categories are always rendered in Normal mode.
    if (category.action === ProtocolItemActionEnum.Discrete) {
      return DisplayModeEnum.Normal;
    }
    return category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
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

