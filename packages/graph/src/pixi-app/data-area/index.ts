import { Application, FederatedPointerEvent } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import type {
  IReading,
  IObservation,
  IProtocol,
  IPeriod,
} from '@actograph/core';
import {
  ReadingTypeEnum,
  ProtocolItemActionEnum,
} from '@actograph/core';
import { YAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import {
  parseProtocolItems,
  ProtocolItem,
  hydrateProtocolItemsFromStringIfNeeded,
} from '../../utils/protocol.utils';
import {
  extractSessionBoundaryReadings,
  mergeContinuousCategoryReadings,
} from '../../utils/continuous-segments.utils';
import type { IGraphRenderOptions } from '../../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';
import { type IPlotBounds } from '../../utils/crosshair.utils';
import { isPointInsidePlotBounds } from '../../utils/hover-overlay.utils';

export interface IDataAreaHoverController {
  scheduleUpdateFromWorldPointer(input: {
    worldX: number;
    worldY: number;
    plotBoundsWorld: IPlotBounds;
    dateTime: Date;
    worldToOverlay: (p: { x: number; y: number }) => { x: number; y: number };
  }): void;
  dismiss(): void;
  clear(options?: { cancelPending?: boolean }): void;
}

export type CategoryPruneHandler = (activeCategoryIds: Set<string>) => void;

export class DataArea extends BaseGroup {
  private yAxis: YAxis;
  private xAxis: xAxis;
  private graphInteractionEnabled: boolean;
  private plotContainer: import('pixi.js').Container | null = null;

  private readingsPerCategory: {
    category: ProtocolItem;
    readings: IReading[];
  }[] = [];

  private pointerHitArea: BaseGraphic;
  private hoverController: IDataAreaHoverController | null = null;
  private worldToOverlay: ((p: { x: number; y: number }) => { x: number; y: number }) | null = null;
  private categoryPruneHandler: CategoryPruneHandler | null = null;

  private protocol: IProtocol | null = null;
  protected observation: IObservation | null = null;
  private pausePeriods: IPeriod[] = [];
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
  private axisStretch = { x: 1, y: 1 };

  public setAxisStretch(stretch: { x: number; y: number }): void {
    this.axisStretch = stretch;
  }

  public getAxisStretch(): { x: number; y: number } {
    return { ...this.axisStretch };
  }

  public getObservation(): IObservation | null {
    return this.observation;
  }

  public getProtocol(): IProtocol | null {
    return this.protocol;
  }

  public getPausePeriods(): readonly IPeriod[] {
    return this.pausePeriods;
  }

  public getGraphRenderOptions(): IGraphRenderOptions {
    return this.graphRenderOptions;
  }

  public getReadingsPerCategory(): ReadonlyArray<{
    category: ProtocolItem;
    readings: IReading[];
  }> {
    return this.readingsPerCategory;
  }

  public getCategoryById(categoryId: string): ProtocolItem | null {
    if (!this.protocol) {
      return null;
    }
    const protocolAny = this.protocol as { _items?: ProtocolItem[]; items?: ProtocolItem[] };
    const items: ProtocolItem[] = protocolAny._items || protocolAny.items || [];
    for (const item of items) {
      if (item.type === 'category' && item.id === categoryId) {
        return item as ProtocolItem;
      }
    }
    return null;
  }

  public setCategoryPruneHandler(handler: CategoryPruneHandler | null): void {
    this.categoryPruneHandler = handler;
  }

  constructor(
    app: Application,
    yAxis: YAxis,
    xAxis: xAxis,
    options?: { interactive?: boolean },
  ) {
    super(app);

    this.yAxis = yAxis;
    this.xAxis = xAxis;
    this.graphInteractionEnabled = options?.interactive ?? true;

    this.pointerHitArea = new BaseGraphic(app);
    this.addChild(this.pointerHitArea);
  }

  public setHoverController(controller: IDataAreaHoverController | null): void {
    this.hoverController = controller;
  }

  public setWorldToOverlay(
    fn: ((p: { x: number; y: number }) => { x: number; y: number }) | null,
  ): void {
    this.worldToOverlay = fn;
  }

  public setPlotContainer(plotContainer: import('pixi.js').Container): void {
    this.plotContainer = plotContainer;
  }

  public init() {
    super.init();

    if (!this.graphInteractionEnabled) {
      this.eventMode = 'none';
      this.pointerHitArea.eventMode = 'none';
      return;
    }

    this.eventMode = 'passive';
    this.pointerHitArea.eventMode = 'static';

    this.pointerHitArea.on('pointermove', (evt: FederatedPointerEvent) => {
      this.processPointerMove(evt);
    });

    this.pointerHitArea.on('pointerleave', () => {
      this.hoverController?.dismiss();
    });
  }

  private processPointerMove(evt: FederatedPointerEvent): void {
    const controller = this.hoverController;
    const worldToOverlay = this.worldToOverlay;
    if (!controller || !worldToOverlay) {
      return;
    }

    const plotBounds = this.getPlotBoundsLocal();
    if (!plotBounds) {
      controller.dismiss();
      return;
    }

    const plotParent = this.parent;
    if (!plotParent || plotParent !== this.plotContainer) {
      controller.dismiss();
      return;
    }

    const p = evt.getLocalPosition(this);
    if (!isPointInsidePlotBounds(p.x, p.y, plotBounds)) {
      controller.dismiss();
      return;
    }

    const plotPos = evt.getLocalPosition(plotParent);
    const dateTime = this.xAxis.getDateTimeFromPos(plotPos.x);

    controller.scheduleUpdateFromWorldPointer({
      worldX: p.x,
      worldY: p.y,
      plotBoundsWorld: plotBounds,
      dateTime,
      worldToOverlay,
    });
  }

  public setPausePeriods(periods: IPeriod[]): void {
    this.pausePeriods = periods;
  }

  public setGraphRenderOptions(options: IGraphRenderOptions): void {
    this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS, ...options };
  }

  public setProtocol(protocol: IProtocol) {
    hydrateProtocolItemsFromStringIfNeeded(protocol);

    this.protocol = protocol;

    const prot = protocol as { _items?: ProtocolItem[]; items?: ProtocolItem[] };
    const items = prot._items || prot.items || [];
    if (items.length > 0 && this.readingsPerCategory.length > 0) {
      for (const entry of this.readingsPerCategory) {
        const updatedCategory = items.find((cat) => cat.id === entry.category.id);
        if (updatedCategory) {
          entry.category = updatedCategory;
        }
      }
    }
  }

  public setData(observation: IObservation) {
    super.setData(observation);
    this.observation = observation;

    const protocol = observation.protocol;
    if (!protocol) {
      throw new Error('No protocol found');
    }
    const categories = parseProtocolItems(protocol);

    this.readingsPerCategory = [];

    for (const category of categories) {
      this.readingsPerCategory.push({
        category,
        readings: [],
      });
    }

    const readings = observation.readings;
    if (readings?.length) {
      const sortedReadings = [...readings]
        .filter((reading) => Number.isFinite(new Date(reading.dateTime).getTime()))
        .sort(
          (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        );

      for (const reading of sortedReadings) {
        if (reading.type === ReadingTypeEnum.DATA) {
          const obsName = reading.name;

          const categoryEntry = this.readingsPerCategory.find((r) =>
            r.category.children?.some((o) => o.name === obsName),
          );
          if (!categoryEntry) {
            console.warn(`Category not found for observable ${obsName}`);
            continue;
          }

          categoryEntry.readings.push(reading);
        }
      }

      const sessionBoundaryReadings = extractSessionBoundaryReadings(sortedReadings);

      for (const categoryEntry of this.readingsPerCategory) {
        const isContinuous = !categoryEntry.category.action ||
          categoryEntry.category.action === ProtocolItemActionEnum.Continuous;

        if (!isContinuous) {
          continue;
        }

        categoryEntry.readings = mergeContinuousCategoryReadings(
          categoryEntry.readings,
          sessionBoundaryReadings,
        );
      }
    }

    const activeCategoryIds = new Set(
      this.readingsPerCategory.map((entry) => entry.category.id),
    );
    this.categoryPruneHandler?.(activeCategoryIds);
  }

  public clear() {
    super.clear();

    this.pointerHitArea.clear();
    this.hoverController?.clear();

    this.readingsPerCategory = [];
  }

  public draw(): void {
    const bounds = this.getAxisBoundsFromAxes();
    if (!bounds) {
      return;
    }
    this.prepareHitArea(bounds.bottomLeft, bounds.topRight);
  }

  public prepareHitArea(
    bottomLeft: { x: number; y: number },
    topRight: { x: number; y: number },
  ): void {
    this.pointerHitArea.clear();
    this.pointerHitArea.rect(
      bottomLeft.x,
      topRight.y,
      topRight.x - bottomLeft.x,
      Math.abs(topRight.y - bottomLeft.y),
    );
    this.pointerHitArea.fill({ color: 'transparent', alpha: 0 });
  }

  private getAxisBoundsFromAxes(): {
    bottomLeft: { x: number; y: number };
    topRight: { x: number; y: number };
  } | null {
    const yAxisStart = this.yAxis.getAxisStart();
    const yAxisEnd = this.yAxis.getAxisEnd();
    if (!yAxisStart || !yAxisEnd) {
      return null;
    }
    const xAxisEnd = this.xAxis.getAxisEnd();
    if (typeof xAxisEnd?.x !== 'number') {
      return null;
    }
    return {
      bottomLeft: yAxisStart as { x: number; y: number },
      topRight: {
        x: xAxisEnd.x,
        y: yAxisEnd.y,
      },
    };
  }

  public getPlotBoundsLocal(): IPlotBounds | null {
    const yAxisStart = this.yAxis.getAxisStart();
    const yAxisEnd = this.yAxis.getAxisEnd();
    const xAxisEnd = this.xAxis.getAxisEnd();
    if (
      !yAxisStart ||
      !yAxisEnd ||
      !xAxisEnd ||
      typeof xAxisEnd.x !== 'number' ||
      typeof xAxisEnd.y !== 'number'
    ) {
      return null;
    }

    const toLocalFromYAxis = (point: { x: number; y: number }) =>
      this.toLocal(this.yAxis.toGlobal(point));
    const toLocalFromXAxis = (point: { x: number; y: number }) =>
      this.toLocal(this.xAxis.toGlobal(point));

    const bottomLeft = toLocalFromYAxis(yAxisStart as { x: number; y: number });
    const topLeft = toLocalFromYAxis(yAxisEnd as { x: number; y: number });
    const bottomRight = toLocalFromXAxis(xAxisEnd as { x: number; y: number });

    return {
      leftX: bottomLeft.x,
      rightX: bottomRight.x,
      topY: topLeft.y,
      bottomY: bottomLeft.y,
    };
  }
}
