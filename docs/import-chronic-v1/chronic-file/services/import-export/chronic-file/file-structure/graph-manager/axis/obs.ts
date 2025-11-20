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

export interface IObsAxis {
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
  obs: {
    version: number;
  };
}

export const exportToBuffer = (axis: IObsAxis, options: {}): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]); // Graph node version
  Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]);
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

  // Obs
  Buffer.concat([buffer, new types.QDouble(axis.obs.version).toBuffer()]);
  return buffer;
};

export const importFromBuffer = (buffer: Buffer, options: {}): IObsAxis => {
  const graphNodeVersion = types.QDouble.read(buffer);
  const version = types.QDouble.read(buffer);

  if (version === 0.1) {
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
    const noLabel = types.QString.read(buffer);
    const drawEndArrow = types.QBool.read(buffer);

    // Obs
    const obsVersion = types.QDouble.read(buffer);

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
      obs: {
        version: obsVersion,
      },
    };
  } else {
    throw new Error(`Version ${version} is not supported`);
  }
};
