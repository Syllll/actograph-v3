import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

import * as Point from './../utils/point';
import * as TimeAxis from './axis/time';
import * as ObsAxis from './axis/obs';

export interface IGraphManagerLayer {
  graphNodeVersion: number; // 0.1
  version: number;
  pixOrigin: Point.IPoint;
  calendarTimeAxis: TimeAxis.ITimeAxis;
  chronometerTimeAxis: TimeAxis.ITimeAxis;
  obsAxis: ObsAxis.IObsAxis;
  leftMargin: number;
  isTimeIntervalManual: boolean;
  manualTimeInterval: number; // Msecs
}

export const exportToBuffer = (
  layer: IGraphManagerLayer,
  options: {},
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(1).toBuffer()]);
  Buffer.concat([buffer, Point.exportToBuffer(layer.pixOrigin)]);
  Buffer.concat([
    buffer,
    TimeAxis.exportToBuffer(layer.chronometerTimeAxis, {}),
  ]);
  Buffer.concat([buffer, TimeAxis.exportToBuffer(layer.calendarTimeAxis, {})]);
  Buffer.concat([buffer, ObsAxis.exportToBuffer(layer.obsAxis, {})]);
  Buffer.concat([buffer, new types.QDouble(layer.leftMargin).toBuffer()]);
  Buffer.concat([
    buffer,
    new types.QBool(layer.isTimeIntervalManual).toBuffer(),
  ]);
  Buffer.concat([
    buffer,
    new types.QInt64(layer.manualTimeInterval).toBuffer(),
  ]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer): IGraphManagerLayer => {
  const graphNodeVersion = types.QDouble.read(buffer);
  const version = types.QDouble.read(buffer);
  let pixOrigin: Point.IPoint;
  let chronometerTimeAxis: TimeAxis.ITimeAxis;
  let calendarTimeAxis: TimeAxis.ITimeAxis;
  let obsAxis: ObsAxis.IObsAxis;
  let leftMargin: number;
  let isTimeIntervalManual: boolean;
  let manualTimeInterval: number;

  if (version === 0.1) {
    pixOrigin = Point.importFromBuffer(buffer);
    chronometerTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    calendarTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    obsAxis = ObsAxis.importFromBuffer(buffer, {});
    leftMargin = 50;
    isTimeIntervalManual = false;
    manualTimeInterval = 0;
  } else if (version === 0.2) {
    pixOrigin = Point.importFromBuffer(buffer);
    chronometerTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    calendarTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    obsAxis = ObsAxis.importFromBuffer(buffer, {});
    leftMargin = types.QDouble.read(buffer);
    isTimeIntervalManual = false;
    manualTimeInterval = 0;
  } else if (version === 1) {
    pixOrigin = Point.importFromBuffer(buffer);
    chronometerTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    calendarTimeAxis = TimeAxis.importFromBuffer(buffer, {});
    obsAxis = ObsAxis.importFromBuffer(buffer, {});
    leftMargin = types.QDouble.read(buffer);
    isTimeIntervalManual = types.QBool.read(buffer);
    manualTimeInterval = types.QInt64.read(buffer);
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    graphNodeVersion,
    version,
    pixOrigin,
    chronometerTimeAxis,
    calendarTimeAxis,
    obsAxis,
    leftMargin,
    isTimeIntervalManual,
    manualTimeInterval,
  };
};
