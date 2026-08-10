import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { ReadingTypeEnum, ProtocolItemActionEnum, } from '@actograph/core';
import { parseProtocolItems, hydrateProtocolItemsFromStringIfNeeded, } from '../../utils/protocol.utils';
import { extractSessionBoundaryReadings, mergeContinuousCategoryReadings, } from '../../utils/continuous-segments.utils';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';
import { isPointInsidePlotBounds } from '../../utils/hover-overlay.utils';
export class DataArea extends BaseGroup {
    setAxisStretch(stretch) {
        this.axisStretch = stretch;
    }
    getAxisStretch() {
        return { ...this.axisStretch };
    }
    getObservation() {
        return this.observation;
    }
    getProtocol() {
        return this.protocol;
    }
    getPausePeriods() {
        return this.pausePeriods;
    }
    getGraphRenderOptions() {
        return this.graphRenderOptions;
    }
    getReadingsPerCategory() {
        return this.readingsPerCategory;
    }
    getCategoryById(categoryId) {
        if (!this.protocol) {
            return null;
        }
        const protocolAny = this.protocol;
        const items = protocolAny._items || protocolAny.items || [];
        for (const item of items) {
            if (item.type === 'category' && item.id === categoryId) {
                return item;
            }
        }
        return null;
    }
    setCategoryPruneHandler(handler) {
        this.categoryPruneHandler = handler;
    }
    constructor(app, yAxis, xAxis, options) {
        super(app);
        this.plotContainer = null;
        this.readingsPerCategory = [];
        this.hoverController = null;
        this.worldToOverlay = null;
        this.categoryPruneHandler = null;
        this.protocol = null;
        this.observation = null;
        this.pausePeriods = [];
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
        this.axisStretch = { x: 1, y: 1 };
        this.yAxis = yAxis;
        this.xAxis = xAxis;
        this.graphInteractionEnabled = options?.interactive ?? true;
        this.pointerHitArea = new BaseGraphic(app);
        this.addChild(this.pointerHitArea);
    }
    setHoverController(controller) {
        this.hoverController = controller;
    }
    setWorldToOverlay(fn) {
        this.worldToOverlay = fn;
    }
    setPlotContainer(plotContainer) {
        this.plotContainer = plotContainer;
    }
    init() {
        super.init();
        if (!this.graphInteractionEnabled) {
            this.eventMode = 'none';
            this.pointerHitArea.eventMode = 'none';
            return;
        }
        this.eventMode = 'passive';
        this.pointerHitArea.eventMode = 'static';
        this.pointerHitArea.on('pointermove', (evt) => {
            this.processPointerMove(evt);
        });
        this.pointerHitArea.on('pointerleave', () => {
            this.hoverController?.dismiss();
        });
    }
    processPointerMove(evt) {
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
    setPausePeriods(periods) {
        this.pausePeriods = periods;
    }
    setGraphRenderOptions(options) {
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS, ...options };
    }
    setProtocol(protocol) {
        hydrateProtocolItemsFromStringIfNeeded(protocol);
        this.protocol = protocol;
        const prot = protocol;
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
    setData(observation) {
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
                .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            for (const reading of sortedReadings) {
                if (reading.type === ReadingTypeEnum.DATA) {
                    const obsName = reading.name;
                    const categoryEntry = this.readingsPerCategory.find((r) => r.category.children?.some((o) => o.name === obsName));
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
                categoryEntry.readings = mergeContinuousCategoryReadings(categoryEntry.readings, sessionBoundaryReadings);
            }
        }
        const activeCategoryIds = new Set(this.readingsPerCategory.map((entry) => entry.category.id));
        this.categoryPruneHandler?.(activeCategoryIds);
    }
    clear() {
        super.clear();
        this.pointerHitArea.clear();
        this.hoverController?.clear();
        this.readingsPerCategory = [];
    }
    draw() {
        const bounds = this.getAxisBoundsFromAxes();
        if (!bounds) {
            return;
        }
        this.prepareHitArea(bounds.bottomLeft, bounds.topRight);
    }
    prepareHitArea(bottomLeft, topRight) {
        this.pointerHitArea.clear();
        this.pointerHitArea.rect(bottomLeft.x, topRight.y, topRight.x - bottomLeft.x, Math.abs(topRight.y - bottomLeft.y));
        this.pointerHitArea.fill({ color: 'transparent', alpha: 0 });
    }
    getAxisBoundsFromAxes() {
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
            bottomLeft: yAxisStart,
            topRight: {
                x: xAxisEnd.x,
                y: yAxisEnd.y,
            },
        };
    }
    getPlotBoundsLocal() {
        const yAxisStart = this.yAxis.getAxisStart();
        const yAxisEnd = this.yAxis.getAxisEnd();
        const xAxisEnd = this.xAxis.getAxisEnd();
        if (!yAxisStart ||
            !yAxisEnd ||
            !xAxisEnd ||
            typeof xAxisEnd.x !== 'number' ||
            typeof xAxisEnd.y !== 'number') {
            return null;
        }
        const toLocalFromYAxis = (point) => this.toLocal(this.yAxis.toGlobal(point));
        const toLocalFromXAxis = (point) => this.toLocal(this.xAxis.toGlobal(point));
        const bottomLeft = toLocalFromYAxis(yAxisStart);
        const topLeft = toLocalFromYAxis(yAxisEnd);
        const bottomRight = toLocalFromXAxis(xAxisEnd);
        return {
            leftX: bottomLeft.x,
            rightX: bottomRight.x,
            topY: topLeft.y,
            bottomY: bottomLeft.y,
        };
    }
}
//# sourceMappingURL=index.js.map