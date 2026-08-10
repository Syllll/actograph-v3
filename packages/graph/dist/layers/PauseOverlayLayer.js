import { Container } from 'pixi.js';
import { BaseLayer } from './Layer';
import { BaseGraphic } from '../lib/base-graphic';
import { computePauseOverlayRects, DEFAULT_PAUSE_OVERLAY_STYLE, } from '../utils/pause-overlay.utils';
export class PauseOverlayLayer extends BaseLayer {
    constructor(app) {
        super('pause');
        this.app = app;
        this.container = new Container();
        this.pauseOverlayGraphic = new BaseGraphic(app);
        this.pauseOverlayGraphic.eventMode = 'none';
        this.container.addChild(this.pauseOverlayGraphic);
    }
    prepare(ctx) {
        const bounds = ctx.getAxisBounds();
        if (!bounds) {
            return;
        }
        const { bottomLeft, topRight } = bounds;
        this.pauseOverlayGraphic.clear();
        const rects = computePauseOverlayRects([...ctx.pausePeriods], {
            leftX: bottomLeft.x,
            rightX: topRight.x,
            topY: topRight.y,
            bottomY: bottomLeft.y,
        }, (date) => ctx.getDateTimePos(date), ctx.graphRenderOptions);
        for (const rect of rects) {
            this.pauseOverlayGraphic
                .rect(rect.x, rect.y, rect.width, rect.height)
                .fill({
                color: DEFAULT_PAUSE_OVERLAY_STYLE.color,
                alpha: DEFAULT_PAUSE_OVERLAY_STYLE.alpha,
            });
        }
    }
    clear() {
        this.pauseOverlayGraphic.clear();
    }
}
//# sourceMappingURL=PauseOverlayLayer.js.map