import { Application } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation } from '@actograph/core';
import { YAxis } from './y-axis';
export declare class xAxis extends BaseGroup {
    private graphic;
    private readings;
    private labelsContainer;
    private yAxis;
    private pixelsPerMsec;
    private axisStartTimeInMsec;
    private axisEndTimeInMsec;
    /** Min/max timestamps from setData (START/STOP or sorted bounds) */
    private minTimeInMsec;
    private maxTimeInMsec;
    /** Total duration in ms for adaptive label formatting (Bug 3.9) */
    private totalDurationMs;
    private styleOptions;
    private ticks;
    private axisStart;
    private axisEnd;
    getAxisStart(): {
        x?: number | undefined;
        y?: number | undefined;
    };
    getAxisEnd(): {
        x?: number | undefined;
        y?: number | undefined;
    };
    constructor(app: Application, yAxis: YAxis);
    getPosFromDateTime(dateTime: Date | string): number;
    getDateTimeFromPos(xPos: number): Date;
    clear(): void;
    setData(observation: IObservation): void;
    draw(): void;
}
//# sourceMappingURL=x-axis.d.ts.map