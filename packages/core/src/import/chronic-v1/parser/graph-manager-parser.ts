import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IGraphManagerV1, IGraphManagerLayerV1 } from '../types/chronic-v1.types';
import { ParseError } from '../../errors';

const types = qtdatastream.types;

/**
 * Parse le graph manager depuis un buffer Qt DataStream
 * Note: Cette implémentation est simplifiée car les métadonnées du graphique
 * ne sont pas utilisées lors de l'import vers v3.
 */
export class GraphManagerV1Parser {
  /**
   * Parse le graph manager depuis le buffer
   */
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IGraphManagerV1 {
    const version = types.QDouble.read(buffer);
    const layers: IGraphManagerLayerV1[] = [];

    if (version === 1) {
      const numOfLayers = types.QInt.read(buffer);

      for (let i = 0; i < numOfLayers; i++) {
        if (i === 0) {
          const graphNodeVersion = types.QDouble.read(buffer);
          const layerVersion = types.QDouble.read(buffer);
          this.parseLayer(buffer, layerVersion);
          layers.push({ graphNodeVersion, version: layerVersion });
        } else if (i === 1) {
          const graphNodeVersion = types.QDouble.read(buffer);
          layers.push({ graphNodeVersion });
        } else {
          throw new ParseError(
            `Seulement 2 layers sont supportées (reçu ${numOfLayers})`,
            'chronic',
          );
        }
      }
    } else {
      throw new ParseError(
        `Version de graph manager ${version} non supportée`,
        'chronic',
      );
    }

    return { version, layers };
  }

  private parseLayer(buffer: CustomBuffer, version: number): void {
    if (version === 0.1 || version === 0.2 || version === 1.0) {
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      this.parseTimeAxis(buffer);
      this.parseTimeAxis(buffer);
      this.skipObsAxis(buffer);
      
      if (version === 0.2 || version === 1.0) {
        types.QDouble.read(buffer);
      }
      
      if (version === 1.0) {
        types.QBool.read(buffer);
        types.QInt64.read(buffer);
      }
    }
  }

  private parseTimeAxis(buffer: typeof CustomBuffer.prototype): void {
    types.QDouble.read(buffer);
    const version = types.QDouble.read(buffer);
    
    if (version === 0.1) {
      types.QBool.read(buffer);
      types.QBool.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QInt64.read(buffer);
      types.QBool.read(buffer);
      types.QUInt.read(buffer);
      
      for (let j = 0; j < 4; j++) types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      types.QDouble.read(buffer);
      
      const tickLabelsSize = types.QUInt.read(buffer);
      for (let i = 0; i < tickLabelsSize; i++) {
        types.QDouble.read(buffer);
        types.QString.read(buffer);
      }
      
      types.QString.read(buffer);
      types.QBool.read(buffer);
      
      const timeVersion = types.QDouble.read(buffer);
      types.QBool.read(buffer);
      types.QDateTime.read(buffer);
      types.QDateTime.read(buffer);
      types.QInt.read(buffer);
      types.QDouble.read(buffer);
      types.QInt.read(buffer);
      types.QDouble.read(buffer);
      
      if (timeVersion === 1.0) {
        types.QString.read(buffer);
      }
    }
  }

  private skipObsAxis(buffer: typeof CustomBuffer.prototype): void {
    types.QDouble.read(buffer);
    types.QDouble.read(buffer);
  }
}

