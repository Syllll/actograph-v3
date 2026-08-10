import { Application, Container } from 'pixi.js';
import type { GraphContext } from '../engine/GraphContext';
import { BaseLayer } from './Layer';
import { BaseGraphic } from '../lib/base-graphic';
import {
  computePauseOverlayRects,
  DEFAULT_PAUSE_OVERLAY_STYLE,
} from '../utils/pause-overlay.utils';

export class PauseOverlayLayer extends BaseLayer {
  readonly container: Container;
  private readonly pauseOverlayGraphic: BaseGraphic;

  constructor(private readonly app: Application) {
    super('pause');
    this.container = new Container();
    this.pauseOverlayGraphic = new BaseGraphic(app);
    this.pauseOverlayGraphic.eventMode = 'none';
    this.container.addChild(this.pauseOverlayGraphic);
  }

  prepare(ctx: GraphContext): void {
    const bounds = ctx.getAxisBounds();
    if (!bounds) {
      return;
    }

    const { bottomLeft, topRight } = bounds;
    this.pauseOverlayGraphic.clear();

    const rects = computePauseOverlayRects(
      [...ctx.pausePeriods],
      {
        leftX: bottomLeft.x,
        rightX: topRight.x,
        topY: topRight.y,
        bottomY: bottomLeft.y,
      },
      (date) => ctx.getDateTimePos(date),
      ctx.graphRenderOptions,
    );

    for (const rect of rects) {
      this.pauseOverlayGraphic
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({
          color: DEFAULT_PAUSE_OVERLAY_STYLE.color,
          alpha: DEFAULT_PAUSE_OVERLAY_STYLE.alpha,
        });
    }
  }

  clear(): void {
    this.pauseOverlayGraphic.clear();
  }
}
