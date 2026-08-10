import { BaseLayer } from './Layer';
export class AxisLayer extends BaseLayer {
    constructor(yAxis, xAxis) {
        super('axis');
        this.yAxis = yAxis;
        this.xAxis = xAxis;
    }
    prepare(_ctx, _options) {
        this.yAxis.beginPaint();
        this.yAxis.draw();
        this.xAxis.beginPaint();
        this.xAxis.draw();
        this.yAxis.commitPaint();
        this.xAxis.commitPaint();
    }
}
//# sourceMappingURL=AxisLayer.js.map