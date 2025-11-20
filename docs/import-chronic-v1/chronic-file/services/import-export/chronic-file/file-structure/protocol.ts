import qtdatastream from '../qtdatastream';
import { BrushStyle } from './utils/brush-style';
const types = qtdatastream.types;

export interface IProtocolNode {
  version?: number;
  name: string;
  type: string;
  isRootNode: boolean;
  colorName: string;
  shape: string;
  thickness: number;
  isVisible: boolean;
  indexInParentContext: number;
  isBackground: boolean;
  backgroundCover: string;
  backgroundMotif: number;
  bX: number;
  bY: number;
  bWidth: number;
  bHeight: number;
  children: IProtocolNode[];
}

export const exportToBuffer = (
  protocol: IProtocolNode,
  options: {},
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QInt(2).toBuffer()]);
  Buffer.concat([buffer, new types.QString(protocol.name).toBuffer()]);
  Buffer.concat([buffer, new types.QString(protocol.type).toBuffer()]);
  Buffer.concat([buffer, new types.QBool(protocol.isRootNode).toBuffer()]);
  Buffer.concat([buffer, new types.QString(protocol.colorName).toBuffer()]);
  Buffer.concat([buffer, new types.QString(protocol.shape).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(protocol.thickness).toBuffer()]);
  Buffer.concat([buffer, new types.QBool(protocol.isVisible).toBuffer()]);
  Buffer.concat([
    buffer,
    new types.QInt(protocol.indexInParentContext).toBuffer(),
  ]);
  Buffer.concat([buffer, new types.QBool(protocol.isBackground).toBuffer()]);
  Buffer.concat([
    buffer,
    new types.QString(protocol.backgroundCover).toBuffer(),
  ]);
  Buffer.concat([buffer, new types.QInt(protocol.backgroundMotif).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(protocol.bX).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(protocol.bY).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(protocol.bWidth).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(protocol.bHeight).toBuffer()]);
  Buffer.concat([buffer, new types.QInt(protocol.children.length).toBuffer()]);
  for (const child of protocol.children) {
    Buffer.concat([buffer, exportToBuffer(child, {})]);
  }

  return buffer;
};

export const importFromBuffer = (
  buffer: Buffer,
  options: {},
): IProtocolNode => {
  const version = types.QInt.read(buffer);
  let name: string;
  let type: string;
  let isRootNode: boolean;
  let colorName: string;
  let shape: string;
  let thickness: number;
  let isVisible: boolean;
  let indexInParentContext: number;
  let isBackground: boolean;
  let backgroundCover: string;
  let backgroundMotif: number;
  let bX: number = -1;
  let bY: number = -1;
  let bWidth: number = -1;
  let bHeight: number = -1;
  const children: IProtocolNode[] = [];

  if (version === 1) {
    name = types.QString.read(buffer);
    type = types.QString.read(buffer);
    isRootNode = types.QBool.read(buffer);
    colorName = types.QString.read(buffer);
    shape = types.QString.read(buffer);
    thickness = types.QDouble.read(buffer);
    isVisible = types.QBool.read(buffer);
    indexInParentContext = types.QInt.read(buffer);
    isBackground = types.QBool.read(buffer);
    backgroundCover = types.QString.read(buffer);

    const motifIndex = types.QInt.read(buffer);
    backgroundMotif = <BrushStyle>motifIndex;

    const numOfChildren = types.QInt.read(buffer);
    for (let i = 0; i < numOfChildren; i++) {
      children.push(importFromBuffer(buffer, {}));
    }
  } else if (version === 2) {
    name = types.QString.read(buffer);
    type = types.QString.read(buffer);
    isRootNode = types.QBool.read(buffer);
    colorName = types.QString.read(buffer);
    shape = types.QString.read(buffer);
    thickness = types.QDouble.read(buffer);
    isVisible = types.QBool.read(buffer);
    indexInParentContext = types.QInt.read(buffer);
    isBackground = types.QBool.read(buffer);
    backgroundCover = types.QString.read(buffer);
    backgroundMotif = <BrushStyle>types.QUInt.read(buffer);
    bX = types.QDouble.read(buffer);
    bY = types.QDouble.read(buffer);
    bWidth = types.QDouble.read(buffer);
    bHeight = types.QDouble.read(buffer);

    const numOfChildren = types.QInt.read(buffer);
    for (let i = 0; i < numOfChildren; i++) {
      children.push(importFromBuffer(buffer, {}));
    }
  } else {
    throw new Error(`Unknown version: ${version}`);
  }

  return {
    version,
    name,
    type,
    isRootNode,
    colorName,
    shape,
    thickness,
    isVisible,
    indexInParentContext,
    isBackground,
    backgroundCover,
    backgroundMotif,
    bX,
    bY,
    bWidth,
    bHeight,
    children,
  };
};
