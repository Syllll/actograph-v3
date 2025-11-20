import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IExtensionDataV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

const types = qtdatastream.types;

/**
 * Parse les données d'extension depuis un buffer Qt DataStream
 */
export class ExtensionDataV1Parser {
  /**
   * Parse les données d'extension depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Données d'extension parsées
   */
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IExtensionDataV1 {
    const version = types.QDouble.read(buffer);
    let extensions: { [key: string]: any } = {};

    if (version === 1) {
      extensions = types.QMap.read(buffer);
    } else {
      throw new BadRequestException(
        `Version de extension data ${version} non supportée`,
      );
    }

    return {
      version,
      extensions,
    };
  }
}

