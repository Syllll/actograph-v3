import qtdatastream from '../../../qtdatastream';
const types = qtdatastream.types;

import * as Point from '../../utils/point';
import * as Rect from '../../utils/rect';
import * as Vector2D from '../../utils/vector2D';
import * as Vector from '../../utils/vector';
import {
  ITickLabel,
  ITimeInterval,
  exportTickLabelToBuffer,
  exportTimeIntervalToBuffer,
  importTickLabelFromBuffer,
  importTimeIntervalFromBuffer,
} from './utils';

export interface ITimeAxis {
  graphNodeVersion: number;
  version: number;
  enableMajorTick: boolean;
  enableMinorTick: boolean;
  majorTickUnit: number;
  minorTickUnit: number;
  length: number;
  offset: number;
  unit: number;
  isTextAlongLine: boolean;
  alignFlag: number;
  labelRect: Rect.IRect;
  origin: Point.IPoint;
  direction: Vector2D.IVector2D;
  tickLabels: ITickLabel[];
  noLabel: string;
  drawEndArrow: boolean;
  time: {
    version: number;
    isMajorTickLengthCustom: boolean;
    startTime: Date;
    endTime: Date;
    majorTickTimeUnit: ITimeInterval;
    minorTickTimeUnit: ITimeInterval;
    manualTimeFormat: string;
  };
}

export const exportToBuffer = (axis: ITimeAxis, options: {}): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]); // Graph node version
  Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]); // Time version
  Buffer.concat([buffer, new types.QBool(axis.enableMajorTick).toBuffer()]);
  Buffer.concat([buffer, new types.QBool(axis.enableMinorTick).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(axis.majorTickUnit).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(axis.minorTickUnit).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(axis.length).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(axis.offset).toBuffer()]);
  Buffer.concat([buffer, new types.QInt64(axis.unit).toBuffer()]);
  Buffer.concat([buffer, new types.QBool(axis.isTextAlongLine).toBuffer()]);
  Buffer.concat([buffer, new types.QUInt(axis.alignFlag).toBuffer()]);
  Buffer.concat([buffer, Rect.exportToBuffer(axis.labelRect)]);
  Buffer.concat([buffer, Point.exportToBuffer(axis.origin)]);
  Buffer.concat([buffer, Vector2D.exportToBuffer(axis.direction)]);
  Buffer.concat([
    buffer,
    Vector.exportToBuffer(axis.tickLabels, {
      exportValueCB(value) {
        return exportTickLabelToBuffer(value);
      },
    }),
  ]);
  Buffer.concat([buffer, new types.QString(axis.noLabel).toBuffer()]);
  Buffer.concat([buffer, new types.QBool(axis.drawEndArrow).toBuffer()]);

  // Time
  Buffer.concat([buffer, new types.QDouble(1.0).toBuffer()]); // Time version
  Buffer.concat([
    buffer,
    new types.QBool(axis.time.isMajorTickLengthCustom).toBuffer(),
  ]);
  Buffer.concat([buffer, new types.QDateTime(axis.time.startTime).toBuffer()]);
  Buffer.concat([buffer, new types.QDateTime(axis.time.endTime).toBuffer()]);
  Buffer.concat([
    buffer,
    exportTimeIntervalToBuffer(axis.time.majorTickTimeUnit),
  ]);
  Buffer.concat([
    buffer,
    exportTimeIntervalToBuffer(axis.time.minorTickTimeUnit),
  ]);
  Buffer.concat([
    buffer,
    new types.QString(axis.time.manualTimeFormat).toBuffer(),
  ]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer, options: {}): ITimeAxis => {
  const graphNodeVersion = types.QDouble.read(buffer);
  if (graphNodeVersion !== 0.1) {
    throw new Error(`Invalid version: ${graphNodeVersion}`);
  }

  const version = types.QDouble.read(buffer);

  if (version === 0.1) {
    console.log({ version });
    const enableMajorTick = types.QBool.read(buffer);
    const enableMinorTick = types.QBool.read(buffer);
    const majorTickUnit = types.QDouble.read(buffer);
    const minorTickUnit = types.QDouble.read(buffer);
    const length = types.QDouble.read(buffer);
    const offset = types.QDouble.read(buffer);
    const unit = types.QInt64.read(buffer);
    const isTextAlongLine = types.QBool.read(buffer);
    const alignFlag = types.QUInt.read(buffer);
    const labelRect = Rect.importFromBuffer(buffer);
    const origin = Point.importFromBuffer(buffer);
    const direction = Vector2D.importFromBuffer(buffer);
    const tickLabels = Vector.importFromBuffer(buffer, {
      importValueCB(buffer) {
        return importTickLabelFromBuffer(buffer);
      },
    });
    console.log({ tickLabels });
    const noLabel = types.QString.read(buffer);
    const drawEndArrow = types.QBool.read(buffer);

    // Time
    const timeVersion = types.QDouble.read(buffer);
    let isMajorTickLengthCustom: boolean;
    let startTime: Date;
    let endTime: Date;
    let majorTickTimeUnit: ITimeInterval;
    let minorTickTimeUnit: ITimeInterval;
    let manualTimeFormat: string;
    if (timeVersion === 0.1) {
      isMajorTickLengthCustom = types.QBool.read(buffer);
      startTime = types.QDateTime.read(buffer);
      endTime = types.QDateTime.read(buffer);
      majorTickTimeUnit = importTimeIntervalFromBuffer(buffer);
      minorTickTimeUnit = importTimeIntervalFromBuffer(buffer);
      manualTimeFormat = 'auto';
    } else if (timeVersion === 1.0) {
      isMajorTickLengthCustom = types.QBool.read(buffer);
      startTime = types.QDateTime.read(buffer);
      endTime = types.QDateTime.read(buffer);
      majorTickTimeUnit = importTimeIntervalFromBuffer(buffer);
      minorTickTimeUnit = importTimeIntervalFromBuffer(buffer);
      manualTimeFormat = types.QString.read(buffer);
    } else {
      throw new Error(`Version ${timeVersion} is not supported`);
    }

    return {
      graphNodeVersion,
      version,
      enableMajorTick,
      enableMinorTick,
      majorTickUnit,
      minorTickUnit,
      length,
      offset,
      unit,
      isTextAlongLine,
      alignFlag,
      labelRect,
      origin,
      direction,
      tickLabels: <ITickLabel[]>tickLabels,
      noLabel,
      drawEndArrow,
      time: {
        version: timeVersion,
        isMajorTickLengthCustom,
        startTime,
        endTime,
        majorTickTimeUnit,
        minorTickTimeUnit,
        manualTimeFormat,
      },
    };
  } else {
    throw new Error(`Version ${version} is not supported`);
  }
};
