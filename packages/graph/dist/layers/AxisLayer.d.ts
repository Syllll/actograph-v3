import type { GraphContext } from '../engine/GraphContext';
import { BaseLayer } from './Layer';
import type { YAxis } from '../pixi-app/axis/y-axis';
import type { xAxis } from '../pixi-app/axis/x-axis';
export declare class AxisLayer extends BaseLayer {
    private readonly yAxis;
    private readonly xAxis;
    constructor(yAxis: YAxis, xAxis: xAxis);
    prepare(_ctx: GraphContext, _options?: import('../engine/types').LayerPrepareOptions): void;
}
//# sourceMappingURL=AxisLayer.d.ts.map