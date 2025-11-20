import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

import * as Layer from './layer';

export interface IGraphManager {
  version?: number;
  layers: Layer.IGraphManagerLayer[];
}

export const exportToBuffer = (
  graphManager: IGraphManager,
  options: {},
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(1).toBuffer()]);
  Buffer.concat([
    buffer,
    new types.QInt(graphManager.layers.length).toBuffer(),
  ]);
  for (let i = 0; i < graphManager.layers.length; i++) {
    if (i === 0) {
      /// Static layer
      const layer = graphManager.layers[i];
      Buffer.concat([buffer, Layer.exportToBuffer(layer, {})]);
    } else if (i === 1) {
      Buffer.concat([buffer, new types.QDouble(0.1).toBuffer()]);
    } else {
      throw new Error(
        `Only two layers are supported (and not ${graphManager.layers.length})`,
      );
    }
  }

  return buffer;
};

export const importFromBuffer = (
  buffer: Buffer,
  options: {},
): IGraphManager => {
  const version = types.QDouble.read(buffer);
  let numOfLayers = 0;
  let layers: Layer.IGraphManagerLayer[] = [];

  if (version === 1) {
    numOfLayers = types.QInt.read(buffer);

    for (let i = 0; i < numOfLayers; i++) {
      if (i === 0) {
        /// Static layer
        const layer = Layer.importFromBuffer(buffer);
        layers.push(layer);
      } else if (i === 1) {
        // Mouse layer
        const graphNodeVersion = types.QDouble.read(buffer);
      } else {
        throw new Error(
          `Only two layers are supported (and not ${numOfLayers})`,
        );
      }
    }
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    version,
    layers,
  };
};
