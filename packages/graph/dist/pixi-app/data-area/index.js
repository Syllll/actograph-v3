import { Text, Container, Graphics } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { ReadingTypeEnum, ObservationModeEnum, BackgroundPatternEnum, DisplayModeEnum, ProtocolItemActionEnum, } from '@actograph/core';
import { parseProtocolItems } from '../../utils/protocol.utils';
import { formatFromDate } from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';
import { createTilingPatternSprite } from '../../lib/pattern-textures';
export class DataArea extends BaseGroup {
    constructor(app, yAxis, xAxis) {
        super(app);
        this.readingsPerCategory = [];
        this.graphicPerCategory = [];
        this.tilingSpritesPerCategory = [];
        this.timeLabelContainer = null;
        this.timeLabel = null;
        this.timeLabelBackground = null;
        this.protocol = null;
        this.observation = null;
        this.yAxis = yAxis;
        this.xAxis = xAxis;
        this.graphicForBackground = new BaseGraphic(app);
        this.addChild(this.graphicForBackground);
        this.pointerDashedLines = new BaseGraphic(app);
        this.addChild(this.pointerDashedLines);
        this.timeLabelContainer = new Container();
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
    }
    init() {
        super.init();
        this.eventMode = 'passive';
        this.graphicForBackground.eventMode = 'static';
        this.graphicForBackground.on('pointermove', (evt) => {
            const origin = this.yAxis.getAxisStart();
            if (!origin) {
                throw new Error('No origin');
            }
            const p = evt.getLocalPosition(this.pointerDashedLines);
            const originLocal = this.pointerDashedLines.toLocal(origin);
            this.pointerDashedLines.clear();
            this.pointerDashedLines
                .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
                .moveTo(p.x, p.y)
                .dashedLineTo(p.x, originLocal.y)
                .stroke();
            this.pointerDashedLines
                .setStrokeStyle({ color: 'black', width: 1, cap: 'butt' })
                .moveTo(p.x, p.y)
                .dashedLineTo(originLocal.x, p.y)
                .stroke();
            if (this.timeLabel) {
                try {
                    const globalPos = this.pointerDashedLines.toGlobal({ x: p.x, y: p.y });
                    const stagePos = this.app.stage.toLocal(globalPos);
                    const dateTime = this.xAxis.getDateTimeFromPos(stagePos.x);
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
                    this.timeLabel.text = timeString;
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
                    this.timeLabelContainer.x = p.x - backgroundWidth / 2;
                    this.timeLabelContainer.y = originLocal.y + 15;
                    this.timeLabelContainer.visible = true;
                }
                catch (error) {
                    if (this.timeLabelContainer) {
                        this.timeLabelContainer.visible = false;
                    }
                }
            }
        });
        this.graphicForBackground.on('pointerleave', () => {
            this.pointerDashedLines.clear();
            if (this.timeLabelContainer) {
                this.timeLabelContainer.visible = false;
            }
        });
    }
    setProtocol(protocol) {
        const prot = protocol;
        // Parse items si c'est une string JSON (format backend)
        if (prot && prot.items && typeof prot.items === 'string') {
            try {
                prot._items = JSON.parse(prot.items);
            }
            catch (e) {
                console.error('Failed to parse protocol items:', e);
                prot._items = [];
            }
        }
        this.protocol = protocol;
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
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
            throw new Error('No readings found');
        }
        for (const reading of readings) {
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
        const lastReading = readings[readings.length - 1];
        if (lastReading.type === ReadingTypeEnum.STOP) {
            for (const categoryEntry of this.readingsPerCategory) {
                categoryEntry.readings.push(lastReading);
            }
        }
    }
    clear() {
        super.clear();
        this.graphicForBackground.clear();
        this.pointerDashedLines.clear();
        if (this.timeLabelContainer) {
            this.timeLabelContainer.visible = false;
        }
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
        this.graphicForBackground.clear();
        const yAxisStart = this.yAxis.getAxisStart();
        const yAxisEnd = this.yAxis.getAxisEnd();
        if (!yAxisStart || !yAxisEnd) {
            return;
        }
        const bottomLeft = yAxisStart;
        const topRight = {
            x: this.xAxis.getAxisEnd().x,
            y: yAxisEnd.y,
        };
        this.graphicForBackground.rect(bottomLeft.x, topRight.y, topRight.x - bottomLeft.x, Math.abs(topRight.y - bottomLeft.y));
        this.graphicForBackground.fill({
            color: 'transparent',
        });
        const backgroundCategories = [];
        const friezeCategories = [];
        const normalCategories = [];
        for (const categoryEntry of this.readingsPerCategory) {
            const displayMode = categoryEntry.category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
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
            this.drawCategoryBackground(categoryEntry);
        }
        for (const categoryEntry of friezeCategories) {
            this.drawCategoryFrieze(categoryEntry);
        }
        for (const categoryEntry of normalCategories) {
            this.drawCategoryNormal(categoryEntry);
        }
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
                    const yPos = this.yAxis.getPosFromLabel(reading.name || '');
                    if (yPos < 0)
                        continue;
                    const prefs = this.getObservablePreferencesForReading(reading.name || '');
                    const color = prefs?.color ?? 'green';
                    const strokeWidth = prefs?.strokeWidth ?? 4;
                    graphic.circle(xPos, yPos, strokeWidth / 2);
                    graphic.setFillStyle({ color });
                    graphic.fill();
                }
            }
        }
        else {
            const firstReading = readings[0];
            if (!firstReading)
                return;
            const startY = this.yAxis.getPosFromLabel(firstReading.name || '');
            if (startY < 0)
                return;
            const start = {
                x: this.yAxis?.getAxisStart()?.x ?? 0,
                y: startY,
            };
            const last = { x: start.x, y: start.y };
            for (let i = 1; i < readings.length; i++) {
                const reading = readings[i];
                if (!reading)
                    throw new Error('No reading found');
                const yPos = reading.type === ReadingTypeEnum.STOP
                    ? -1
                    : this.yAxis.getPosFromLabel(reading.name || '');
                const xPos = this.xAxis.getPosFromDateTime(reading.dateTime);
                const horizontalPrefs = this.getObservablePreferencesForReading(readings[i - 1]?.name || firstReading.name || '');
                const horizontalColor = horizontalPrefs?.color ?? 'green';
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
                last.y = yPos;
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
        const bottomLeft = yAxisStart;
        const topRight = {
            x: this.xAxis.getAxisEnd().x,
            y: yAxisEnd.y,
        };
        const zoneHeight = Math.abs(topRight.y - bottomLeft.y);
        const zoneTopY = topRight.y;
        for (let i = 0; i < readings.length; i++) {
            const reading = readings[i];
            if (!reading || reading.type !== ReadingTypeEnum.DATA)
                continue;
            const nextReading = readings[i + 1];
            if (!nextReading)
                continue;
            const startX = this.xAxis.getPosFromDateTime(reading.dateTime);
            const endX = this.xAxis.getPosFromDateTime(nextReading.dateTime);
            const zoneWidth = endX - startX;
            if (zoneWidth <= 0)
                continue;
            const prefs = this.getObservablePreferencesForReading(reading.name || '');
            const color = prefs?.color ?? category.graphPreferences?.color ?? 'green';
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
                    const prefs = this.getObservablePreferencesForReading(reading.name || '');
                    const color = prefs?.color ?? 'green';
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
        for (let i = 0; i < readings.length; i++) {
            const reading = readings[i];
            if (!reading || reading.type !== ReadingTypeEnum.DATA)
                continue;
            const segmentStartX = this.xAxis.getPosFromDateTime(reading.dateTime);
            const nextReading = readings[i + 1];
            if (!nextReading)
                continue;
            const segmentEndX = this.xAxis.getPosFromDateTime(nextReading.dateTime);
            const segmentWidth = segmentEndX - segmentStartX;
            if (segmentWidth <= 0)
                continue;
            const prefs = this.getObservablePreferencesForReading(reading.name || '');
            const color = prefs?.color ?? category.graphPreferences?.color ?? 'green';
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
    getObservablePreferencesForReading(observableName) {
        if (!this.protocol) {
            return null;
        }
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
        const prot = this.protocol;
        const items = prot._items || prot.items || [];
        if (!items.length) {
            return null;
        }
        for (const category of items) {
            if (category.type !== 'category' || !category.children) {
                continue;
            }
            const observable = category.children.find((obs) => obs.name === observableName && obs.type === 'observable');
            if (observable) {
                if (observable.graphPreferences) {
                    return observable.graphPreferences;
                }
                if (category.graphPreferences) {
                    return category.graphPreferences;
                }
                return null;
            }
        }
        return null;
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
        const displayMode = category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
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
}
//# sourceMappingURL=index.js.map