import { Application, Container } from 'pixi.js';
import {
  DisplayModeEnum,
  isCategoryVisible,
  mergeGraphPreferences,
  type IGraphPreferences,
  type IProtocolItem,
} from '@actograph/core';
import type { GraphContext } from './GraphContext';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { DataArea } from '../pixi-app/data-area';
import type { YAxis } from '../pixi-app/axis/y-axis';
import type { xAxis } from '../pixi-app/axis/x-axis';
import { getEffectiveDisplayMode } from '../utils/category-display.utils';
import type { ProtocolItem } from '../utils/protocol.utils';
import { AxisLayer } from '../layers/AxisLayer';
import { BackgroundLayer } from '../layers/BackgroundLayer';
import { FriezeLayer } from '../layers/FriezeLayer';
import { SeriesLayer } from '../layers/SeriesLayer';
import { PauseOverlayLayer } from '../layers/PauseOverlayLayer';

export interface GraphEngineOptions {
  app: Application;
  plot: Container;
  dataArea: DataArea;
  yAxis: YAxis;
  xAxis: xAxis;
  patternStore: PatternTextureStore;
}

export class GraphEngine {
  readonly worldRoot: Container;
  private readonly dataArea: DataArea;
  private readonly yAxis: YAxis;
  private readonly xAxis: xAxis;
  private readonly patternStore: PatternTextureStore;

  private readonly axisLayer: AxisLayer;
  private readonly backgroundLayer: BackgroundLayer;
  private readonly friezeLayer: FriezeLayer;
  private readonly seriesLayer: SeriesLayer;
  private readonly pauseLayer: PauseOverlayLayer;

  constructor(options: GraphEngineOptions) {
    this.dataArea = options.dataArea;
    this.yAxis = options.yAxis;
    this.xAxis = options.xAxis;
    this.patternStore = options.patternStore;

    this.worldRoot = new Container();
    this.backgroundLayer = new BackgroundLayer(options.app, this.patternStore);
    this.friezeLayer = new FriezeLayer(options.app, this.patternStore);
    this.seriesLayer = new SeriesLayer(options.app, this.patternStore);
    this.pauseLayer = new PauseOverlayLayer(options.app);

    this.worldRoot.addChild(this.backgroundLayer.container);
    this.worldRoot.addChild(this.friezeLayer.container);
    this.worldRoot.addChild(this.seriesLayer.container);
    this.worldRoot.addChild(this.pauseLayer.container);

    const plotChildIndex = options.plot.getChildIndex(options.dataArea);
    options.plot.addChildAt(this.worldRoot, plotChildIndex);

    this.axisLayer = new AxisLayer(this.yAxis, this.xAxis);
  }

  buildContext(): GraphContext {
    const dataArea = this.dataArea;
    const yAxis = this.yAxis;
    const xAxis = this.xAxis;

    return {
      observation: dataArea.getObservation(),
      protocol: dataArea.getProtocol(),
      patternStore: this.patternStore,
      graphRenderOptions: dataArea.getGraphRenderOptions(),
      axisStretch: dataArea.getAxisStretch(),
      pausePeriods: dataArea.getPausePeriods(),
      readingsPerCategory: dataArea.getReadingsPerCategory(),
      getYPos: (categoryId: string, observableName: string) => {
        const scopedPos = yAxis.getPosFromCategoryObservable(categoryId, observableName);
        if (scopedPos >= 0) {
          return scopedPos;
        }
        return yAxis.getPosFromLabel(observableName);
      },
      getDateTimePos: (date: Date | string) => xAxis.getPosFromDateTime(date),
      getAxisBounds: () => {
        const yAxisStart = yAxis.getAxisStart();
        const yAxisEnd = yAxis.getAxisEnd();
        if (!yAxisStart || !yAxisEnd) {
          return null;
        }
        const xAxisEnd = xAxis.getAxisEnd();
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
      },
      getFriezeInfo: (categoryId: string) => yAxis.getFriezeInfo(categoryId),
      getObservablePreferences: (category: ProtocolItem, observableName: string) =>
        this.getObservablePreferencesForReading(category, observableName),
      getCategoryById: (categoryId: string) => dataArea.getCategoryById(categoryId),
      getEffectiveDisplayMode,
    };
  }

  prepareWorld(): void {
    const ctx = this.buildContext();
    const bounds = ctx.getAxisBounds();
    if (!bounds) {
      return;
    }

    for (const entry of ctx.readingsPerCategory) {
      if (!isCategoryVisible(entry.category)) {
        this.clearCategoryAllLayers(entry.category.id);
      }
    }

    this.dataArea.prepareHitArea(bounds.bottomLeft, bounds.topRight);

    this.axisLayer.prepare(ctx);
    this.backgroundLayer.prepare(ctx);
    this.friezeLayer.prepare(ctx);
    this.seriesLayer.prepare(ctx);
    this.pauseLayer.prepare(ctx);

    this.backgroundLayer.commit();
    this.seriesLayer.commit();
  }

  pruneStaleCategories(activeCategoryIds: Set<string>): void {
    this.backgroundLayer.pruneStaleCategories(activeCategoryIds);
    this.friezeLayer.pruneStaleCategories(activeCategoryIds);
    this.seriesLayer.pruneStaleCategories(activeCategoryIds);
  }

  clearCategoryAllLayers(categoryId: string): void {
    this.backgroundLayer.clearCategory(categoryId);
    this.friezeLayer.clearCategory(categoryId);
    this.seriesLayer.clearCategory(categoryId);
  }

  redrawCategory(categoryId: string): void {
    const ctx = this.buildContext();
    const categoryEntry = ctx.readingsPerCategory.find((r) => r.category.id === categoryId);
    if (!categoryEntry) {
      return;
    }

    if (!isCategoryVisible(categoryEntry.category)) {
      this.clearCategoryAllLayers(categoryId);
      return;
    }

    this.clearCategoryInOtherLayers(categoryId, ctx.getEffectiveDisplayMode(categoryEntry.category));

    switch (ctx.getEffectiveDisplayMode(categoryEntry.category)) {
      case DisplayModeEnum.Background:
        this.backgroundLayer.redrawCategory(categoryId, ctx);
        break;
      case DisplayModeEnum.Frieze:
        this.friezeLayer.redrawCategory(categoryId, ctx);
        break;
      default:
        this.seriesLayer.redrawCategory(categoryId, ctx);
        break;
    }
  }

  redrawObservable(observableId: string): void {
    const protocol = this.dataArea.getProtocol();
    if (!protocol) {
      return;
    }

    const prot = protocol as { _items?: ProtocolItem[]; items?: ProtocolItem[] };
    const items = prot._items || prot.items || [];
    if (!items.length) {
      return;
    }

    let targetCategory: ProtocolItem | null = null;
    for (const category of items) {
      if (category.children) {
        const observable = category.children.find((o: IProtocolItem) => o.id === observableId);
        if (observable) {
          targetCategory = category;
          break;
        }
      }
    }

    if (!targetCategory) {
      return;
    }

    this.redrawCategory(targetCategory.id);
  }

  hasPatternSprites(): boolean {
    return this.backgroundLayer.hasPatternSprites() || this.friezeLayer.hasPatternSprites();
  }

  clearPatternSprites(): void {
    this.backgroundLayer.clearPatternSprites();
    this.friezeLayer.clearPatternSprites();
  }

  clearAll(): void {
    this.backgroundLayer.clearAll();
    this.friezeLayer.clearAll();
    this.seriesLayer.clearAll();
    this.pauseLayer.clear();
  }

  private clearCategoryInOtherLayers(categoryId: string, mode: DisplayModeEnum): void {
    if (mode !== DisplayModeEnum.Background) {
      this.backgroundLayer.clearCategory(categoryId);
    }
    if (mode !== DisplayModeEnum.Frieze) {
      this.friezeLayer.clearCategory(categoryId);
    }
    if (mode !== DisplayModeEnum.Normal) {
      this.seriesLayer.clearCategory(categoryId);
    }
  }

  private getObservablePreferencesForReading(
    category: ProtocolItem,
    observableName: string,
  ): IGraphPreferences | null {
    const protocol = this.dataArea.getProtocol();
    if (!protocol || !category.children?.length || !observableName) {
      return null;
    }

    const observable = category.children.find(
      (obs: IProtocolItem) => obs.name === observableName && obs.type === 'observable',
    );

    if (!observable) {
      return null;
    }

    return mergeGraphPreferences(category.graphPreferences, observable.graphPreferences);
  }
}
