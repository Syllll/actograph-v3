import type { GraphContext } from '../engine/GraphContext';
import { BaseLayer } from './Layer';
import type { YAxis } from '../pixi-app/axis/y-axis';
import type { xAxis } from '../pixi-app/axis/x-axis';

export class AxisLayer extends BaseLayer {
  constructor(
    private readonly yAxis: YAxis,
    private readonly xAxis: xAxis,
  ) {
    super('axis');
  }

  prepare(_ctx: GraphContext, _options?: import('../engine/types').LayerPrepareOptions): void {
    this.yAxis.beginPaint();
    this.yAxis.draw();
    this.xAxis.beginPaint();
    this.xAxis.draw();
  }

  commit(): void {
    this.yAxis.commitPaint();
    this.xAxis.commitPaint();
  }
}
