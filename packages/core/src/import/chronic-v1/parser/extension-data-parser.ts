import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IExtensionDataV1 } from '../types/chronic-v1.types';
import { ParseError } from '../../errors';

const types = qtdatastream.types;

/**
 * Parse les données d'extension depuis un buffer Qt DataStream
 */
export class ExtensionDataV1Parser {
  /**
   * Parse les données d'extension depuis le buffer
   */
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IExtensionDataV1 {
    const version = types.QDouble.read(buffer);
    let extensions: { [key: string]: unknown } = {};

    if (version === 1) {
      extensions = types.QMap.read(buffer);
    } else {
      throw new ParseError(
        `Version de extension data ${version} non supportée`,
        'chronic',
      );
    }

    return { version, extensions };
  }
}

