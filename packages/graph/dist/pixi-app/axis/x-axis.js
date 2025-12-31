import { Container, Text } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { ObservationModeEnum } from '@actograph/core';
import { formatFromDate } from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';
const timeSteps = {
    '10ms': 10,
    '100ms': 100,
    '1s': 1000,
    '10s': 10 * 1000,
    '1m': 60 * 1000,
    '10m': 60 * 10 * 1000,
    '30m': 60 * 30 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 60 * 60 * 2 * 1000,
    '4h': 60 * 60 * 4 * 1000,
    '6h': 60 * 60 * 6 * 1000,
    '8h': 60 * 60 * 8 * 1000,
    '12h': 60 * 60 * 12 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '2d': 24 * 60 * 60 * 2 * 1000,
    '3d': 24 * 60 * 60 * 3 * 1000,
    '4d': 24 * 60 * 60 * 4 * 1000,
    '5d': 24 * 60 * 60 * 5 * 1000,
    '6d': 24 * 60 * 60 * 6 * 1000,
    '7d': 24 * 60 * 60 * 7 * 1000,
    '8d': 24 * 60 * 60 * 8 * 1000,
    '1w': 24 * 60 * 60 * 7 * 1000,
    '2w': 24 * 60 * 60 * 14 * 1000,
    '3w': 24 * 60 * 60 * 21 * 1000,
    '4w': 24 * 60 * 60 * 28 * 1000,
    '1M': 24 * 60 * 60 * 30 * 1000,
    '2M': 24 * 60 * 60 * 60 * 1000,
    '3M': 24 * 60 * 60 * 90 * 1000,
    '6M': 24 * 60 * 60 * 180 * 1000,
    '1y': 24 * 60 * 60 * 365 * 1000,
    '2y': 24 * 60 * 60 * 365 * 2 * 1000,
    '3y': 24 * 60 * 60 * 365 * 3 * 1000,
    '4y': 24 * 60 * 60 * 365 * 4 * 1000,
    '5y': 24 * 60 * 60 * 365 * 5 * 1000,
    '6y': 24 * 60 * 60 * 365 * 6 * 1000,
    '10y': 24 * 60 * 60 * 365 * 10 * 1000,
    '20y': 24 * 60 * 60 * 365 * 20 * 1000,
};
export class xAxis extends BaseGroup {
    getAxisStart() {
        return { ...this.axisStart };
    }
    getAxisEnd() {
        return { ...this.axisEnd };
    }
    constructor(app, yAxis) {
        super(app);
        this.readings = [];
        this.pixelsPerMsec = 0;
        this.axisStartTimeInMsec = 0;
        this.axisEndTimeInMsec = 0;
        this.styleOptions = {
            axis: { color: 'black', width: 2 },
            tick: { color: 'black', width: 1 },
            label: { color: 'black', fontSize: 12, fontFamily: 'Arial' },
        };
        this.ticks = [];
        this.axisStart = null;
        this.axisEnd = null;
        this.yAxis = yAxis;
        this.graphic = new BaseGraphic(this.app);
        this.addChild(this.graphic);
        this.labelsContainer = new Container();
        this.addChild(this.labelsContainer);
    }
    getPosFromDateTime(dateTime) {
        const dateTimeInMsec = new Date(dateTime).getTime();
        const axisStart = this.yAxis.getAxisStart();
        if (!axisStart || !axisStart.x) {
            throw new Error('No axis start found');
        }
        const pos = axisStart.x + (dateTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;
        return pos;
    }
    getDateTimeFromPos(xPos) {
        if (this.pixelsPerMsec === 0) {
            throw new Error('Axis not initialized: pixelsPerMsec is 0');
        }
        if (this.axisStartTimeInMsec === 0) {
            throw new Error('Axis not initialized: axisStartTimeInMsec is 0');
        }
        const axisStart = this.yAxis.getAxisStart();
        if (!axisStart || axisStart.x === undefined) {
            throw new Error('No axis start found');
        }
        const pixelsFromStart = xPos - axisStart.x;
        const timeDiffInMsec = pixelsFromStart / this.pixelsPerMsec;
        const dateTimeInMsec = this.axisStartTimeInMsec + timeDiffInMsec;
        return new Date(dateTimeInMsec);
    }
    clear() {
        this.labelsContainer.removeChildren();
        this.ticks = [];
        this.pixelsPerMsec = 0;
        super.clear();
    }
    setData(observation) {
        super.setData(observation);
        const readings = observation.readings;
        if (!readings?.length) {
            throw new Error('No readings found');
        }
        this.readings = readings;
        const minReading = readings[0];
        const maxReading = readings[readings.length - 1];
        const minTimeInMsec = new Date(minReading.dateTime).getTime();
        const maxTimeInMsec = new Date(maxReading.dateTime).getTime();
        const idealTimeStep = (maxTimeInMsec - minTimeInMsec) / 5;
        let bestTimeStep = null;
        let diff = Number.MAX_SAFE_INTEGER;
        for (const timeStep of Object.keys(timeSteps)) {
            const timeStepValue = timeSteps[timeStep];
            const delta = Math.abs(timeStepValue - idealTimeStep);
            if (delta < diff) {
                bestTimeStep = timeStep;
                diff = delta;
            }
        }
        if (!bestTimeStep) {
            throw new Error('No best time step found');
        }
        const mainTimeStepInMsec = timeSteps[bestTimeStep];
        const ticks = [];
        const firstTickTimeInMsec = Math.round(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;
        let currentTimeInMsec = firstTickTimeInMsec;
        while (currentTimeInMsec <= maxTimeInMsec + mainTimeStepInMsec) {
            if (currentTimeInMsec >= minTimeInMsec) {
                const dateTime = new Date(currentTimeInMsec);
                let label;
                if (this.observation?.mode === ObservationModeEnum.Chronometer) {
                    label = formatFromDate(dateTime, CHRONOMETER_T0);
                }
                else {
                    label = dateTime
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
                ticks.push({ dateTime, label });
            }
            currentTimeInMsec += mainTimeStepInMsec;
        }
        this.ticks = ticks;
    }
    draw() {
        this.graphic.clear();
        this.graphic.x = 0;
        this.graphic.y = 0;
        this.labelsContainer.removeChildren();
        this.labelsContainer.x = 0;
        this.labelsContainer.y = 0;
        this.x = 0;
        this.y = 0;
        this.scale.set(1);
        this.rotation = 0;
        const width = this.app.screen.width;
        const xAxisStart = this.yAxis.getAxisStart();
        if (!xAxisStart || !xAxisStart.x || !xAxisStart.y) {
            throw new Error('No x axis start found');
        }
        this.axisStart = xAxisStart;
        const xAxisEnd = {
            x: width * 0.9,
            y: xAxisStart.y,
        };
        if (!xAxisEnd || !xAxisEnd.x || !xAxisEnd.y) {
            throw new Error('No x axis end found');
        }
        this.axisEnd = xAxisEnd;
        this.graphic.moveTo(xAxisStart.x, xAxisStart.y);
        this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.setStrokeStyle({
            color: this.styleOptions.axis.color,
            width: this.styleOptions.axis.width,
        });
        this.graphic.stroke();
        this.graphic.moveTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 10);
        this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 10);
        this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.closePath();
        this.graphic.fill({ color: this.styleOptions.axis.color });
        const axisLengthInPixels = xAxisEnd.x - xAxisStart.x - 20;
        const startReading = this.readings[0];
        if (this.ticks.length === 0) {
            console.warn('No ticks generated for X axis');
            return;
        }
        const endTickTimeInMsecs = new Date(this.ticks[this.ticks.length - 1].dateTime).getTime();
        const startTimeInMsecs = new Date(startReading.dateTime).getTime();
        const endTimeInMsecs = endTickTimeInMsecs;
        this.axisStartTimeInMsec = startTimeInMsecs;
        this.axisEndTimeInMsec = endTimeInMsecs;
        const axisTimeLengthInMsec = endTimeInMsecs - startTimeInMsecs;
        const pixelsPerMsec = axisLengthInPixels / axisTimeLengthInMsec;
        this.pixelsPerMsec = pixelsPerMsec;
        for (const tick of this.ticks) {
            const tickTimeInMsec = new Date(tick.dateTime).getTime();
            const tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * pixelsPerMsec;
            tick.pos = tickXpos;
            this.graphic.moveTo(tickXpos, xAxisStart.y - 10);
            this.graphic.lineTo(tickXpos, xAxisStart.y + 10);
            this.graphic.setStrokeStyle({
                color: this.styleOptions.tick.color,
                width: this.styleOptions.tick.width,
            });
            this.graphic.stroke();
            const label = new Text({
                text: tick.label,
                style: {
                    fontSize: this.styleOptions.label.fontSize,
                    fill: this.styleOptions.label.color,
                    fontFamily: this.styleOptions.label.fontFamily,
                },
            });
            label.x = tickXpos;
            label.y = xAxisStart.y + 12;
            label.anchor.set(-0.05, 0);
            label.angle = 45;
            label.visible = true;
            label.alpha = 1;
            this.labelsContainer.addChild(label);
        }
        this.labelsContainer.visible = true;
        this.labelsContainer.alpha = 1;
        this.visible = true;
        this.alpha = 1;
    }
}
//# sourceMappingURL=x-axis.js.map