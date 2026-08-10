import { BaseLayer } from './Layer';
export class AxisLayer extends BaseLayer {
    constructor(yAxis, xAxis) {
        super('axis');
        this.yAxis = yAxis;
        this.xAxis = xAxis;
    }
    prepare(_ctx) {
        this.yAxis.draw();
        this.xAxis.draw();
    }
}
//# sourceMappingURL=AxisLayer.js.map