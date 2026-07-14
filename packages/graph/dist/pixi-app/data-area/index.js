import { Text, Container, Graphics } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { ReadingTypeEnum, ObservationModeEnum, BackgroundPatternEnum, DisplayModeEnum, ProtocolItemActionEnum, mergeGraphPreferences, resolveGraphColor, } from '@actograph/core';
import { parseProtocolItems, hydrateProtocolItemsFromStringIfNeeded, } from '../../utils/protocol.utils';
import { formatFromDate } from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';
import { createTilingPatternSprite } from '../../lib/pattern-textures';
import { extractSessionBoundaryReadings, getContinuousSegmentStartIndices, iterContinuousDataPairs, mergeContinuousCategoryReadings, shouldSkipInContinuousDraw, } from '../../utils/continuous-segments.utils';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';
import { computePauseOverlayRects, DEFAULT_PAUSE_OVERLAY_STYLE, } from '../../utils/pause-overlay.utils';
import { computeCrosshairSegments, computeHoverTimeLabelPosition, } from '../../utils/crosshair.utils';
import { shouldRenderHoverOverlay } from '../../utils/hover-overlay.utils';
export class DataArea extends BaseGroup {
    constructor(app, yAxis, xAxis, options) {
        super(app);
        this.plotContainer = null;
        this.readingsPerCategory = [];
        this.graphicPerCategory = [];
        this.tilingSpritesPerCategory = [];
        this.timeLabelContainer = null;
        this.timeLabel = null;
        this.timeLabelBackground = null;
        this.protocol = null;
        this.observation = null;
        this.pausePeriods = [];
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
        this.hoverOverlaySuppressed = false;
        /** Latest raw pointermove event awaiting the next animation frame. */
        this.pendingHoverEvent = null;
        this.hoverRafId = null;
        this.lastTimeLabelText = null;
        this.yAxis = yAxis;
        this.xAxis = xAxis;
        this.graphInteractionEnabled = options?.interactive ?? true;
        this.graphicForBackground = new BaseGraphic(app);
        this.addChild(this.graphicForBackground);
        this.pauseOverlayGraphic = new BaseGraphic(app);
        this.addChild(this.pauseOverlayGraphic);
        this.pointerDashedLines = new BaseGraphic(app);
        this.addChild(this.pointerDashedLines);
        this.timeLabelContainer = new Container();
        this.timeLabelContainer.visible = false;
        this.addChild(this.timeLabelContainer);
        this.timeLabelBackground = new Graphics();
        this.timeLabelContainer.addChild(this.timeLabelBackground);
        this.timeLabel = new Text({
            text: '',
            style: {
                fontSize: 12,
                fill: 'black',
                fontFamily: 'Arial',
            },
        });
        this.timeLabelContainer.addChild(this.timeLabel);
        this.configureHoverOverlayPassthrough();
    }
    /** Hover visuals must not steal pointer events from the plot hit area. */
    configureHoverOverlayPassthrough() {
        this.pointerDashedLines.eventMode = 'none';
        if (this.timeLabelContainer) {
            this.timeLabelContainer.eventMode = 'none';
        }
        if (this.timeLabelBackground) {
            this.timeLabelBackground.eventMode = 'none';
        }
        if (this.timeLabel) {
            this.timeLabel.eventMode = 'none';
        }
    }
    setPlotContainer(plotContainer) {
        this.plotContainer = plotContainer;
    }
    /** Hides crosshair and dynamic time label (used before image export). */
    clearHoverOverlay() {
        this.cancelPendingHoverUpdate();
        this.pointerDashedLines.clear();
        if (this.timeLabelContainer) {
            this.timeLabelContainer.visible = false;
        }
    }
    /** Drops any pointermove update queued for the next animation frame. */
    cancelPendingHoverUpdate() {
        if (this.hoverRafId !== null) {
            cancelAnimationFrame(this.hoverRafId);
            this.hoverRafId = null;
        }
        this.pendingHoverEvent = null;
    }
    /**
     * Suppresses hover UI while true so exports never capture crosshair or labels.
     */
    setHoverOverlaySuppressed(suppressed) {
        this.hoverOverlaySuppressed = suppressed;
        if (suppressed) {
            this.clearHoverOverlay();
        }
    }
    init() {
        super.init();
        if (!this.graphInteractionEnabled) {
            this.eventMode = 'none';
            this.graphicForBackground.eventMode = 'none';
            if (this.timeLabelContainer) {
                this.timeLabelContainer.visible = false;
            }
            return;
        }
        this.configureHoverOverlayPassthrough();
        this.eventMode = 'passive';
        this.graphicForBackground.eventMode = 'static';
        this.graphicForBackground.on('pointermove', (evt) => {
            // Coalesce to one update per displayed frame instead of once per raw
            // pointer event: a high-poll-rate mouse can fire far more pointermove
            // events than the screen can render, and each update redraws the
            // crosshair and regenerates the time label's text texture.
            this.pendingHoverEvent = evt;
            if (this.hoverRafId === null) {
                this.hoverRafId = requestAnimationFrame(() => {
                    this.hoverRafId = null;
                    const pendingEvent = this.pendingHoverEvent;
                    this.pendingHoverEvent = null;
                    if (pendingEvent) {
                        this.processPointerMove(pendingEvent);
                    }
                });
            }
        });
        this.graphicForBackground.on('pointerleave', () => {
            this.clearHoverOverlay();
        });
    }
    processPointerMove(evt) {
        if (!shouldRenderHoverOverlay({
            interactive: this.graphInteractionEnabled,
            suppressed: this.hoverOverlaySuppressed,
        })) {
            return;
        }
        const plotBounds = this.getPlotBoundsLocal();
        if (!plotBounds) {
            this.clearHoverOverlay();
            return;
        }
        const plotParent = this.parent;
        if (!plotParent || plotParent !== this.plotContainer) {
            this.clearHoverOverlay();
            return;
        }
        const p = evt.getLocalPosition(this.pointerDashedLines);
        const { vertical, horizontal } = computeCrosshairSegments(p.x, p.y, plotBounds);
        this.pointerDashedLines.clear();
        this.pointerDashedLines
            .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
            .moveTo(vertical.x1, vertical.y1)
            .dashedLineTo(vertical.x2, vertical.y2)
            .stroke();
        this.pointerDashedLines
            .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
            .moveTo(horizontal.x1, horizontal.y1)
            .dashedLineTo(horizontal.x2, horizontal.y2)
            .stroke();
        if (this.timeLabel) {
            try {
                const plotPos = evt.getLocalPosition(plotParent);
                const dateTime = this.xAxis.getDateTimeFromPos(plotPos.x);
                let timeString;
                if (this.observation?.mode === ObservationModeEnum.Chronometer) {
                    timeString = formatFromDate(dateTime, CHRONOMETER_T0);
                }
                else {
                    timeString = dateTime
                        .toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3,
                    })
                        .replace(/\//g, '-');
                }
                if (!this.timeLabel || !this.timeLabelContainer || !this.timeLabelBackground) {
                    return;
                }
                // Regenerating the text texture is the costliest part of this handler;
                // skip it when the displayed string hasn't actually changed (e.g. the
                // pointer moved only vertically, same x-axis position).
                if (this.lastTimeLabelText !== timeString) {
                    this.timeLabel.text = timeString;
                    this.lastTimeLabelText = timeString;
                }
                const padding = 4;
                const textWidth = this.timeLabel.width;
                const textHeight = this.timeLabel.height;
                const backgroundWidth = textWidth + padding * 2;
                const backgroundHeight = textHeight + padding * 2;
                this.timeLabelBackground.clear();
                this.timeLabelBackground.rect(0, 0, backgroundWidth, backgroundHeight);
                this.timeLabelBackground.fill({ color: 'white' });
                this.timeLabel.x = padding;
                this.timeLabel.y = padding;
                const labelPos = computeHoverTimeLabelPosition(p.x, p.y, backgroundWidth, backgroundHeight, plotBounds);
                this.timeLabelContainer.x = labelPos.x;
                this.timeLabelContainer.y = labelPos.y;
                this.timeLabelContainer.visible = true;
            }
            catch (error) {
                if (this.timeLabelContainer) {
                    this.timeLabelContainer.visible = false;
                }
            }
        }
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
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
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
        if (!readings?.length) {
            // Keep axis/protocol visible even when there are temporarily no readings.
            return;
        }
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
    clear() {
        super.clear();
        this.graphicForBackground.clear();
        this.pauseOverlayGraphic.clear();
        this.clearHoverOverlay();
        this.readingsPerCategory = [];
        for (const graphicEntry of this.graphicPerCategory) {
            graphicEntry.graphic.clear();
            this.removeChild(graphicEntry.graphic);
        }
        this.graphicPerCategory = [];
        for (const spriteEntry of this.tilingSpritesPerCategory) {
            for (const sprite of spriteEntry.sprites) {
                this.removeChild(sprite);
                sprite.destroy();
            }
        }
        this.tilingSpritesPerCategory = [];
    }
    draw() {
        if (this.hoverOverlaySuppressed) {
            this.clearHoverOverlay();
        }
        const yAxisStart = this.yAxis.getAxisStart();
        const yAxisEnd = this.yAxis.getAxisEnd();
        if (!yAxisStart || !yAxisEnd) {
            return;
        }
        const xAxisEnd = this.xAxis.getAxisEnd();
        if (typeof xAxisEnd?.x !== 'number') {
            return;
        }
        const bottomLeft = yAxisStart;
        const topRight = {
            x: xAxisEnd.x,
            y: yAxisEnd.y,
        };
        // Restore the pointer hit area before redrawing segments so hover does not
        // drop with pointerleave/pointermove oscillation mid-draw.
        this.drawPointerHitArea(bottomLeft, topRight);
        const backgroundCategories = [];
        const friezeCategories = [];
        const normalCategories = [];
        for (const categoryEntry of this.readingsPerCategory) {
            const displayMode = this.getEffectiveDisplayMode(categoryEntry.category);
            if (displayMode === DisplayModeEnum.Background) {
                backgroundCategories.push(categoryEntry);
            }
            else if (displayMode === DisplayModeEnum.Frieze) {
                friezeCategories.push(categoryEntry);
            }
            else {
                normalCategories.push(categoryEntry);
            }
        }
        backgroundCategories.sort((a, b) => {
            const aHasSupport = a.category.graphPreferences?.supportCategoryId ? 1 : 0;
            const bHasSupport = b.category.graphPreferences?.supportCategoryId ? 1 : 0;
            return aHasSupport - bHasSupport;
        });
        for (const categoryEntry of backgroundCategories) {
            try {
                this.drawCategoryBackground(categoryEntry);
            }
            catch (e) {
                console.warn(`Failed to draw background category ${categoryEntry.category.name}:`, e);
            }
        }
        for (const categoryEntry of friezeCategories) {
            try {
                this.drawCategoryFrieze(categoryEntry);
            }
            catch (e) {
                console.warn(`Failed to draw frieze category ${categoryEntry.category.name}:`, e);
            }
        }
        for (const categoryEntry of normalCategories) {
            try {
                this.drawCategoryNormal(categoryEntry);
            }
            catch (e) {
                console.warn(`Failed to draw normal category ${categoryEntry.category.name}:`, e);
            }
        }
        this.drawPauseOverlay(bottomLeft, topRight);
        this.ensureCursorUiOnTop();
    }
    drawPauseOverlay(bottomLeft, topRight) {
        this.pauseOverlayGraphic.clear();
        const rects = computePauseOverlayRects(this.pausePeriods, {
            leftX: bottomLeft.x,
            rightX: topRight.x,
            topY: topRight.y,
            bottomY: bottomLeft.y,
        }, (date) => this.xAxis.getPosFromDateTime(date), this.graphRenderOptions);
        for (const rect of rects) {
            this.pauseOverlayGraphic
                .rect(rect.x, rect.y, rect.width, rect.height)
                .fill({
                color: DEFAULT_PAUSE_OVERLAY_STYLE.color,
                alpha: DEFAULT_PAUSE_OVERLAY_STYLE.alpha,
            });
        }
    }
    drawPointerHitArea(bottomLeft, topRight) {
        this.graphicForBackground.clear();
        this.graphicForBackground.rect(bottomLeft.x, topRight.y, topRight.x - bottomLeft.x, Math.abs(topRight.y - bottomLeft.y));
        this.graphicForBackground.fill({ color: 'transparent' });
    }
    /** Plot bounds in the crosshair layer local space (correct axis conversion). */
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
        const toLocalFromYAxis = (point) => this.pointerDashedLines.toLocal(this.yAxis.toGlobal(point));
        const toLocalFromXAxis = (point) => this.pointerDashedLines.toLocal(this.xAxis.toGlobal(point));
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
    /** Keep crosshair and time label above segments and pause overlays. */
    ensureCursorUiOnTop() {
        const count = this.children.length;
        if (count < 3) {
            return;
        }
        this.setChildIndex(this.timeLabelContainer, count - 1);
        this.setChildIndex(this.pointerDashedLines, count - 2);
        this.setChildIndex(this.pauseOverlayGraphic, count - 3);
    }
    getOrCreateGraphicForCategory(category) {
        let graphicEntry = this.graphicPerCategory.find((g) => g.category.id === category.id);
        if (!graphicEntry) {
            const graphic = new BaseGraphic(this.app);
            this.addChild(graphic);
            this.graphicPerCategory.push({
                category,
                graphic,
            });
            graphicEntry = this.graphicPerCategory.find((g) => g.category.id === category.id);
        }
        if (!graphicEntry) {
            throw new Error('Graphic not found for category');
        }
        return graphicEntry.graphic;
    }
    drawCategoryNormal(categoryEntry) {
        const category = categoryEntry.category;
        const readings = categoryEntry.readings;
        const graphic = this.getOrCreateGraphicForCategory(category);
        graphic.clear();
        const isDiscrete = category.action === ProtocolItemActionEnum.Discrete;
        if (isDiscrete) {
            for (const reading of readings) {
                if (reading.type === ReadingTypeEnum.DATA) {
                    const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
                    const yPos = this.getYPosForReading(category, reading.name || '');
                    if (yPos < 0)
                        continue;
                    const prefs = this.getObservablePreferencesForReading(category, reading.name || '');
                    const color = resolveGraphColor(prefs);
                    const strokeWidth = prefs?.strokeWidth ?? 4;
                    graphic.circle(xPos, yPos, strokeWidth / 2);
                    graphic.setFillStyle({ color });
                    graphic.fill();
                }
            }
        }
        else {
            const firstDataReading = readings.find((reading) => reading.type === ReadingTypeEnum.DATA);
            if (!firstDataReading)
                return;
            const startY = this.getYPosForReading(category, firstDataReading.name || '');
            if (startY < 0)
                return;
            const start = {
                // Start the first segment at the first DATA timestamp for this category.
                // Otherwise categories that start later appear active from axis origin.
                x: this.xAxis.getPosFromDateTime(firstDataReading.dateTime),
                y: startY,
            };
            const last = { x: start.x, y: start.y };
            const minVisibleSegmentPx = 2;
            const xAxisEnd = this.xAxis.getAxisEnd();
            if (typeof xAxisEnd?.x !== 'number') {
                return;
            }
            const axisEndX = xAxisEnd.x;
            const newSegmentIndices = new Set(getContinuousSegmentStartIndices(readings).filter((idx) => idx > 0));
            for (let i = 1; i < readings.length; i++) {
                const reading = readings[i];
                if (!reading)
                    throw new Error('No reading found');
                const previousReading = readings[i - 1];
                if (shouldSkipInContinuousDraw(reading, previousReading)) {
                    continue;
                }
                // New segment after STOP: fresh anchor, no bridge across the gap.
                if (reading.type === ReadingTypeEnum.DATA && newSegmentIndices.has(i)) {
                    const yPos = this.getYPosForReading(category, reading.name || '');
                    if (yPos < 0)
                        continue;
                    const rawXPos = this.xAxis.getPosFromDateTime(reading.dateTime);
                    let xPos = rawXPos;
                    if (xPos <= last.x) {
                        xPos = last.x + minVisibleSegmentPx;
                    }
                    if (xPos > axisEndX) {
                        xPos = axisEndX;
                    }
                    last.x = xPos;
                    last.y = yPos;
                    continue;
                }
                const yPos = reading.type === ReadingTypeEnum.STOP
                    ? -1
                    : this.getYPosForReading(category, reading.name || '');
                // Consecutive readings can share the same timestamp (mobile taps in same second).
                // Without a minimum spacing, segments collapse to zero width and look "missing".
                const rawXPos = this.xAxis.getPosFromDateTime(reading.dateTime);
                let xPos = rawXPos;
                if (xPos <= last.x) {
                    xPos = last.x + minVisibleSegmentPx;
                }
                if (xPos > axisEndX) {
                    xPos = axisEndX;
                }
                const previousDataName = previousReading?.type === ReadingTypeEnum.DATA
                    ? previousReading.name
                    : firstDataReading.name || '';
                const horizontalPrefs = this.getObservablePreferencesForReading(category, previousDataName || firstDataReading.name || '');
                const horizontalColor = resolveGraphColor(horizontalPrefs);
                const horizontalStrokeWidth = horizontalPrefs?.strokeWidth ?? 2;
                graphic.moveTo(last.x, last.y);
                graphic.lineTo(xPos, last.y);
                graphic.setStrokeStyle({
                    color: horizontalColor,
                    width: horizontalStrokeWidth,
                });
                graphic.stroke();
                if (yPos >= 0) {
                    graphic.moveTo(xPos, last.y);
                    graphic.lineTo(xPos, yPos);
                    graphic.setStrokeStyle({
                        color: 'grey',
                        width: 1,
                    });
                    graphic.stroke();
                }
                last.x = xPos;
                if (yPos >= 0) {
                    last.y = yPos;
                }
            }
        }
    }
    drawCategoryBackground(categoryEntry) {
        const category = categoryEntry.category;
        const readings = categoryEntry.readings;
        const graphic = this.getOrCreateGraphicForCategory(category);
        graphic.clear();
        this.clearTilingSpritesForCategory(category);
        if (category.action === ProtocolItemActionEnum.Discrete) {
            return;
        }
        if (readings.length === 0)
            return;
        const yAxisStart = this.yAxis.getAxisStart();
        const yAxisEnd = this.yAxis.getAxisEnd();
        if (!yAxisStart || !yAxisEnd) {
            return;
        }
        const xAxisEnd = this.xAxis.getAxisEnd();
        if (typeof xAxisEnd?.x !== 'number') {
            return;
        }
        const bottomLeft = yAxisStart;
        const topRight = {
            x: xAxisEnd.x,
            y: yAxisEnd.y,
        };
        const fullZoneTopY = topRight.y;
        const fullZoneBottomY = bottomLeft.y;
        const backgroundZone = this.getBackgroundZoneForCategory(category, fullZoneTopY, fullZoneBottomY);
        const zoneTopY = backgroundZone.topY;
        const zoneHeight = backgroundZone.height;
        if (zoneHeight <= 0) {
            return;
        }
        for (const { from, to } of iterContinuousDataPairs(readings)) {
            const startX = this.xAxis.getPosFromDateTime(from.dateTime);
            const endX = this.xAxis.getPosFromDateTime(to.dateTime);
            const zoneWidth = endX - startX;
            if (zoneWidth <= 0)
                continue;
            const prefs = this.getObservablePreferencesForReading(category, from.name || '');
            const color = resolveGraphColor(prefs);
            const pattern = prefs?.backgroundPattern ??
                category.graphPreferences?.backgroundPattern ??
                BackgroundPatternEnum.Solid;
            if (pattern === BackgroundPatternEnum.Solid) {
                graphic.rect(startX, zoneTopY, zoneWidth, zoneHeight).fill({ color, alpha: 0.2 });
            }
            else {
                const tilingSprite = createTilingPatternSprite(pattern, color, startX, zoneTopY, zoneWidth, zoneHeight);
                if (tilingSprite) {
                    this.addChildAt(tilingSprite, 0);
                    this.addTilingSpriteForCategory(category, tilingSprite);
                }
            }
        }
    }
    getBackgroundZoneForCategory(category, fullZoneTopY, fullZoneBottomY) {
        const supportCategoryId = category.graphPreferences?.supportCategoryId;
        if (!supportCategoryId) {
            return {
                topY: fullZoneTopY,
                height: Math.max(0, fullZoneBottomY - fullZoneTopY),
            };
        }
        const supportCategory = this.getCategoryById(supportCategoryId);
        if (!supportCategory) {
            return {
                topY: fullZoneTopY,
                height: Math.max(0, fullZoneBottomY - fullZoneTopY),
            };
        }
        if (supportCategory.graphPreferences?.displayMode === DisplayModeEnum.Frieze) {
            const friezeInfo = this.yAxis.getFriezeInfo(supportCategory.id);
            if (!friezeInfo) {
                return {
                    topY: fullZoneTopY,
                    height: Math.max(0, fullZoneBottomY - fullZoneTopY),
                };
            }
            const top = Math.min(friezeInfo.startY, friezeInfo.endY);
            const bottom = Math.max(friezeInfo.startY, friezeInfo.endY);
            const clampedTop = Math.max(fullZoneTopY, top);
            const clampedBottom = Math.min(fullZoneBottomY, bottom);
            return {
                topY: clampedTop,
                height: Math.max(0, clampedBottom - clampedTop),
            };
        }
        const supportYPositions = (supportCategory.children || [])
            .map((observable) => this.yAxis.getPosFromCategoryObservable(supportCategory.id, observable.name))
            .filter((pos) => pos >= 0);
        if (supportYPositions.length === 0) {
            return {
                topY: fullZoneTopY,
                height: Math.max(0, fullZoneBottomY - fullZoneTopY),
            };
        }
        const rowHalfHeight = 15; // Matches YAxis normal row spacing (~30px rows).
        const top = Math.min(...supportYPositions) - rowHalfHeight;
        const bottom = Math.max(...supportYPositions) + rowHalfHeight;
        const clampedTop = Math.max(fullZoneTopY, top);
        const clampedBottom = Math.min(fullZoneBottomY, bottom);
        return {
            topY: clampedTop,
            height: Math.max(0, clampedBottom - clampedTop),
        };
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
    getYPosForReading(category, observableName) {
        // Prefer category-aware lookup to avoid collisions when observables share labels.
        const scopedPos = this.yAxis.getPosFromCategoryObservable(category.id, observableName);
        if (scopedPos >= 0) {
            return scopedPos;
        }
        return this.yAxis.getPosFromLabel(observableName);
    }
    clearTilingSpritesForCategory(category) {
        const spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === category.id);
        if (spriteEntry) {
            for (const sprite of spriteEntry.sprites) {
                this.removeChild(sprite);
                sprite.destroy();
            }
            spriteEntry.sprites = [];
        }
    }
    addTilingSpriteForCategory(category, sprite) {
        let spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === category.id);
        if (!spriteEntry) {
            spriteEntry = { category, sprites: [] };
            this.tilingSpritesPerCategory.push(spriteEntry);
        }
        spriteEntry.sprites.push(sprite);
    }
    drawCategoryFrieze(categoryEntry) {
        const category = categoryEntry.category;
        const readings = categoryEntry.readings;
        const graphic = this.getOrCreateGraphicForCategory(category);
        graphic.clear();
        this.clearTilingSpritesForCategory(category);
        if (category.action === ProtocolItemActionEnum.Discrete) {
            const friezeInfo = this.yAxis.getFriezeInfo(category.id);
            if (!friezeInfo)
                return;
            for (const reading of readings) {
                if (reading.type === ReadingTypeEnum.DATA) {
                    const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
                    const yPos = friezeInfo.centerY;
                    const prefs = this.getObservablePreferencesForReading(category, reading.name || '');
                    const color = resolveGraphColor(prefs);
                    const strokeWidth = prefs?.strokeWidth ?? 4;
                    graphic.circle(xPos, yPos, strokeWidth / 2);
                    graphic.setFillStyle({ color });
                    graphic.fill();
                }
            }
            return;
        }
        if (readings.length === 0)
            return;
        const friezeInfo = this.yAxis.getFriezeInfo(category.id);
        if (!friezeInfo) {
            console.warn(`Frieze info not found for category ${category.id}`);
            return;
        }
        const friezeTopY = friezeInfo.endY;
        const friezeHeight = friezeInfo.height;
        for (const { from, to } of iterContinuousDataPairs(readings)) {
            const segmentStartX = this.xAxis.getPosFromDateTime(from.dateTime);
            const segmentEndX = this.xAxis.getPosFromDateTime(to.dateTime);
            const segmentWidth = segmentEndX - segmentStartX;
            if (segmentWidth <= 0)
                continue;
            const prefs = this.getObservablePreferencesForReading(category, from.name || '');
            const color = resolveGraphColor(prefs);
            const pattern = prefs?.backgroundPattern ??
                category.graphPreferences?.backgroundPattern ??
                BackgroundPatternEnum.Solid;
            if (pattern === BackgroundPatternEnum.Solid) {
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .fill({ color, alpha: 0.6 });
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .stroke({ color: color, width: 1 });
            }
            else {
                const tilingSprite = createTilingPatternSprite(pattern, color, segmentStartX, friezeTopY, segmentWidth, friezeHeight);
                if (tilingSprite) {
                    this.addChildAt(tilingSprite, 0);
                    this.addTilingSpriteForCategory(category, tilingSprite);
                }
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .stroke({ color: color, width: 1 });
            }
        }
    }
    getObservablePreferencesForReading(category, observableName) {
        if (!this.protocol || !category.children?.length || !observableName) {
            return null;
        }
        const observable = category.children.find((obs) => obs.name === observableName && obs.type === 'observable');
        if (!observable) {
            return null;
        }
        return mergeGraphPreferences(category.graphPreferences, observable.graphPreferences);
    }
    redrawObservable(observableId) {
        if (!this.protocol) {
            return;
        }
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
        const prot = this.protocol;
        const items = prot._items || prot.items || [];
        if (!items.length) {
            return;
        }
        let targetCategory = null;
        for (const category of items) {
            if (category.children) {
                const observable = category.children.find((o) => o.id === observableId);
                if (observable) {
                    targetCategory = category;
                    break;
                }
            }
        }
        if (!targetCategory) {
            return;
        }
        const category = targetCategory;
        const categoryEntry = this.readingsPerCategory.find((r) => r.category.id === category.id);
        if (!categoryEntry) {
            return;
        }
        const displayMode = this.getEffectiveDisplayMode(category);
        switch (displayMode) {
            case DisplayModeEnum.Background:
                this.drawCategoryBackground(categoryEntry);
                break;
            case DisplayModeEnum.Frieze:
                this.drawCategoryFrieze(categoryEntry);
                break;
            default:
                this.drawCategoryNormal(categoryEntry);
                break;
        }
    }
    getEffectiveDisplayMode(category) {
        // Discrete categories are always rendered in Normal mode.
        if (category.action === ProtocolItemActionEnum.Discrete) {
            return DisplayModeEnum.Normal;
        }
        return category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
    }
}
//# sourceMappingURL=index.js.map