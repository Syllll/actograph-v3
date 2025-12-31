import { Text } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { DisplayModeEnum } from '@actograph/core';
import { parseProtocolItems } from '../../utils/protocol.utils';
// ============================================================================
// Constants
// ============================================================================
const AXIS_CONFIG = {
    OFFSET_X: 150,
    OFFSET_Y: 20,
    LINE_WIDTH: 2,
    COLOR: 'black',
};
const TICK_CONFIG = {
    OBSERVABLE_HEIGHT: 30,
    FRIEZE_HEIGHT: 40,
    CATEGORY_SPACING: 15,
    TICK_LENGTH: 10,
    FRIEZE_TICK_LENGTH: 5,
    TICK_WIDTH: 1,
    COLOR: 'black',
};
const LABEL_CONFIG = {
    OFFSET: 12,
    FONT_SIZE: 12,
    FONT_FAMILY: 'Arial',
    COLOR: 'black',
};
const ARROW_CONFIG = {
    SIZE: 10,
};
// ============================================================================
// Class
// ============================================================================
export class YAxis extends BaseGroup {
    constructor(app) {
        super(app);
        this.ticks = [];
        this.categories = [];
        this.axisStart = null;
        this.axisEnd = null;
        this.graphic = new BaseGraphic(this.app);
        this.addChild(this.graphic);
    }
    getAxisStart() {
        return this.axisStart ? { ...this.axisStart } : null;
    }
    getAxisEnd() {
        return this.axisEnd ? { ...this.axisEnd } : null;
    }
    getPosFromLabel(label) {
        for (const tick of this.ticks) {
            if (tick.label === label) {
                this.assertTickHasPosition(tick);
                return tick.pos;
            }
            if (tick.isFrieze && tick.category.children) {
                const observable = tick.category.children.find((o) => o.name === label);
                if (observable) {
                    this.assertTickHasPosition(tick);
                    return tick.pos;
                }
            }
        }
        return -1;
    }
    getFriezeInfo(categoryId) {
        const tick = this.ticks.find((t) => t.isFrieze && t.category.id === categoryId);
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
    isCategoryBackground(categoryId) {
        const category = this.categories.find((c) => c.id === categoryId);
        return category?.graphPreferences?.displayMode === DisplayModeEnum.Background;
    }
    isCategoryFrieze(categoryId) {
        const category = this.categories.find((c) => c.id === categoryId);
        return category?.graphPreferences?.displayMode === DisplayModeEnum.Frieze;
    }
    getRequiredHeight() {
        const { axisLength } = this.computeAxisLengthAndTicks();
        const extraMargin = 20;
        return axisLength + AXIS_CONFIG.OFFSET_Y + extraMargin;
    }
    setData(observation) {
        super.setData(observation);
        const protocol = observation.protocol;
        if (!protocol) {
            throw new Error('No protocol found');
        }
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
        const prot = protocol;
        const items = prot._items || prot.items;
        this.categories = items?.length
            ? items
            : parseProtocolItems(protocol);
    }
    setProtocol(protocol) {
        // Utilise _items en priorité (format frontend) ou items (format mobile/core)
        const prot = protocol;
        const items = prot._items || prot.items;
        if (items?.length) {
            this.categories = items;
        }
    }
    clear() {
        this.removeLabels();
        this.graphic.clear();
        this.ticks = [];
        this.axisStart = null;
        this.axisEnd = null;
        super.clear();
    }
    draw() {
        this.prepareForDraw();
        const { axisLength, ticks } = this.computeAxisLengthAndTicks();
        const yAxisStart = {
            x: AXIS_CONFIG.OFFSET_X,
            y: axisLength + AXIS_CONFIG.OFFSET_Y,
        };
        const yAxisEnd = {
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
    prepareForDraw() {
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
    drawAxisLine(start, end) {
        this.graphic.moveTo(start.x, start.y);
        this.graphic.lineTo(end.x, end.y);
        this.graphic.setStrokeStyle({
            color: AXIS_CONFIG.COLOR,
            width: AXIS_CONFIG.LINE_WIDTH,
        });
        this.graphic.stroke();
    }
    drawArrow(position) {
        const size = ARROW_CONFIG.SIZE;
        this.graphic.moveTo(position.x, position.y);
        this.graphic.lineTo(position.x + size, position.y + size);
        this.graphic.lineTo(position.x - size, position.y + size);
        this.graphic.lineTo(position.x, position.y);
        this.graphic.closePath();
        this.graphic.fill({ color: AXIS_CONFIG.COLOR });
    }
    drawTicks(axisStart) {
        for (const tick of this.ticks) {
            this.assertTickHasPosition(tick);
            const tickYPos = tick.pos;
            if (tick.isFrieze) {
                this.drawFriezeTick(axisStart.x, tickYPos, tick.label);
            }
            else {
                this.drawNormalTick(axisStart.x, tickYPos, tick.label);
            }
        }
    }
    drawNormalTick(axisX, tickY, label) {
        this.graphic.moveTo(axisX - TICK_CONFIG.TICK_LENGTH, tickY);
        this.graphic.lineTo(axisX + TICK_CONFIG.TICK_LENGTH, tickY);
        this.graphic.setStrokeStyle({
            color: TICK_CONFIG.COLOR,
            width: TICK_CONFIG.TICK_WIDTH,
        });
        this.graphic.stroke();
        this.createLabel(label, axisX - LABEL_CONFIG.OFFSET, tickY, false);
    }
    drawFriezeTick(axisX, tickY, label) {
        this.graphic.moveTo(axisX - TICK_CONFIG.FRIEZE_TICK_LENGTH, tickY);
        this.graphic.lineTo(axisX + TICK_CONFIG.FRIEZE_TICK_LENGTH, tickY);
        this.graphic.setStrokeStyle({
            color: TICK_CONFIG.COLOR,
            width: TICK_CONFIG.TICK_WIDTH,
        });
        this.graphic.stroke();
        this.createLabel(label, axisX - LABEL_CONFIG.OFFSET, tickY, true);
    }
    createLabel(text, x, y, bold) {
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
    removeLabels() {
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child !== this.graphic) {
                this.removeChild(child);
            }
        }
    }
    computeAxisLengthAndTicks() {
        let axisLength = 0;
        const ticks = [];
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
            }
            else {
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
    convertTicksToAbsolutePositions(ticks, axisStart) {
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
    assertTickHasPosition(tick) {
        if (tick.pos === undefined || tick.pos === null) {
            throw new Error(`Tick with label "${tick.label}" has no position`);
        }
    }
}
//# sourceMappingURL=y-axis.js.map