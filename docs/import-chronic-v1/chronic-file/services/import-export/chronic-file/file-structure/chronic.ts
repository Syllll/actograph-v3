import qtdatastream from '../qtdatastream';
const types = qtdatastream.types;

import * as ExtensionData from './extension-data';
import * as GraphManager from './graph-manager';
import * as ModeManager from './mode-manager';
import * as Protocol from './protocol';
import * as Reading from './reading';

export interface IChronic {
  version: number;
  name: string;
  protocol: Protocol.IProtocolNode;
  reading: Reading.IReading;
  hasSaveFile: boolean;
  saveFile: string;
  modeManager: ModeManager.IModeManager;
  graphManager: GraphManager.IGraphManager;
  autoPosButtons: boolean;
  extensionData: ExtensionData.IExtensionData;
  scaleFactor: number;
  buttonsWidth: number;
}

export const exportToBuffer = (chronic: IChronic, options: {}): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(chronic.version ?? 3).toBuffer()]);
  Buffer.concat([buffer, new types.QString(chronic.name).toBuffer()]);
  Buffer.concat([buffer, Protocol.exportToBuffer(chronic.protocol, {})]);
  Buffer.concat([buffer, Reading.exportToBuffer(chronic.reading, {})]);
  Buffer.concat([buffer, new types.QBool(chronic.hasSaveFile).toBuffer()]);
  Buffer.concat([buffer, new types.QString(chronic.saveFile).toBuffer()]);
  Buffer.concat([buffer, ModeManager.exportToBuffer(chronic.modeManager, {})]);
  Buffer.concat([
    buffer,
    GraphManager.exportToBuffer(chronic.graphManager, {}),
  ]);
  Buffer.concat([buffer, new types.QBool(chronic.autoPosButtons).toBuffer()]);
  Buffer.concat([
    buffer,
    ExtensionData.exportToBuffer(chronic.extensionData, {}),
  ]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer, options: {}): IChronic => {
  const version = types.QDouble.read(buffer);
  let name: string;
  let protocol: Protocol.IProtocolNode;
  let reading: Reading.IReading;
  let hasSaveFile: boolean;
  let saveFile: string;
  let modeManager: ModeManager.IModeManager;
  let graphManager: GraphManager.IGraphManager;
  let autoPosButtons = true;
  let extensionData: ExtensionData.IExtensionData = {
    version: 1.0,
    extensions: {},
  };
  let scaleFactor = 1;
  let buttonsWidth = 160 * scaleFactor;

  if (version === 1) {
    name = types.QString.read(buffer);
    protocol = Protocol.importFromBuffer(buffer, {});
    reading = Reading.importFromBuffer(buffer, {});
    hasSaveFile = types.QBool.read(buffer);
    saveFile = types.QString.read(buffer);
    modeManager = ModeManager.importFromBuffer(buffer, {});
    graphManager = GraphManager.importFromBuffer(buffer, {});
  } else if (version === 2) {
    name = types.QString.read(buffer);
    protocol = Protocol.importFromBuffer(buffer, {});
    reading = Reading.importFromBuffer(buffer, {});
    hasSaveFile = types.QBool.read(buffer);
    saveFile = types.QString.read(buffer);
    modeManager = ModeManager.importFromBuffer(buffer, {});
    graphManager = GraphManager.importFromBuffer(buffer, {});
    autoPosButtons = types.QBool.read(buffer);
    buttonsWidth = types.QDouble.read(buffer);
  } else if (version === 3) {
    name = types.QString.read(buffer);
    protocol = Protocol.importFromBuffer(buffer, {});
    reading = Reading.importFromBuffer(buffer, {});
    hasSaveFile = types.QBool.read(buffer);
    saveFile = types.QString.read(buffer);
    modeManager = ModeManager.importFromBuffer(buffer, {});
    graphManager = GraphManager.importFromBuffer(buffer, {});
    autoPosButtons = types.QBool.read(buffer);
    buttonsWidth = types.QDouble.read(buffer);
    extensionData = ExtensionData.importFromBuffer(buffer, {});
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    version,
    name,
    protocol,
    reading,
    hasSaveFile,
    saveFile,
    modeManager,
    graphManager,
    autoPosButtons,
    extensionData,
    scaleFactor,
    buttonsWidth,
  };
};
