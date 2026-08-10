import { Container } from 'pixi.js';
import { BaseLayer } from './Layer';
import { BaseGraphic } from '../lib/base-graphic';
import { computePauseOverlayRects, DEFAULT_PAUSE_OVERLAY_STYLE, } from '../utils/pause-overlay.utils';
import { safeRect } from '../utils/safe-graphics.utils';
export class PauseOverlayLayer extends BaseLayer {
    constructor(app) {
        super('pause');
        this.app = app;
        this.container = new Container();
        this.displayGraphic = new BaseGraphic(app);
        this.paintGraphic = new BaseGraphic(app);
        this.displayGraphic.eventMode = 'none';
        this.paintGraphic.eventMode = 'none';
        this.paintGraphic.visible = false;
        this.container.addChild(this.displayGraphic);
        this.container.addChild(this.paintGraphic);
    }
    prepare(ctx, _options) {
        const bounds = ctx.getAxisBounds();
        if (!bounds) {
            return;
        }
        const { bottomLeft, topRight } = bounds;
        this.paintGraphic.clear();
        const rects = computePauseOverlayRects([...ctx.pausePeriods], {
            leftX: bottomLeft.x,
            rightX: topRight.x,
            topY: topRight.y,
            bottomY: bottomLeft.y,
        }, (date) => ctx.getDateTimePos(date), ctx.graphRenderOptions);
        for (const rect of rects) {
            safeRect(this.paintGraphic, rect.x, rect.y, rect.width, rect.height, {
                fill: {
                    color: DEFAULT_PAUSE_OVERLAY_STYLE.color,
                    alpha: DEFAULT_PAUSE_OVERLAY_STYLE.alpha,
                },
            });
        }
    }
    commit() {
        this.displayGraphic.visible = false;
        this.paintGraphic.visible = true;
        const previousDisplay = this.displayGraphic;
        this.displayGraphic = this.paintGraphic;
        this.paintGraphic = previousDisplay;
        this.paintGraphic.visible = false;
        this.paintGraphic.clear();
    }
    clear() {
        this.displayGraphic.clear();
        this.paintGraphic.clear();
    }
}
//# sourceMappingURL=PauseOverlayLayer.js.map