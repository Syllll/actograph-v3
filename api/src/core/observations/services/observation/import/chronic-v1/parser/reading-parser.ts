import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IReadingV1, IReadingEntryV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

const types = qtdatastream.types;

/**
 * Parse les readings depuis un buffer Qt DataStream
 */
export class ReadingV1Parser {
  /**
   * Parse une entrée de reading depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Entrée de reading parsée
   */
  private parseEntryFromBuffer(buffer: CustomBuffer): IReadingEntryV1 {
    const version = types.QDouble.read(buffer);

    let id = -1;
    let name: string;
    let flag: string;
    let time: Date;

    if (version === 1) {
      name = types.QString.read(buffer);
      flag = types.QString.read(buffer);
      time = types.QDateTime.read(buffer);
    } else if (version === 2) {
      name = types.QString.read(buffer);
      flag = types.QString.read(buffer);
      time = types.QDateTime.read(buffer);
    } else if (version === 3) {
      id = types.QInt.read(buffer);
      name = types.QString.read(buffer);
      flag = types.QString.read(buffer);
      time = types.QDateTime.read(buffer);
    } else {
      throw new BadRequestException(
        `Version de reading entry ${version} non supportée`,
      );
    }

    return {
      version,
      id,
      name,
      flag,
      time,
    };
  }

  /**
   * Parse la structure complète des readings depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Structure de readings parsée
   */
  public parseFromBuffer(buffer: CustomBuffer): IReadingV1 {
    const version = types.QDouble.read(buffer);
    let hasLinkedVideoFile: boolean;
    let hasLinkedAudioFile: boolean;
    let mediaFilePath: string;
    let dataManagerType: string;
    const readings: IReadingEntryV1[] = [];

    if (version === 1 || version === 2 || version === 3) {
      hasLinkedVideoFile = types.QBool.read(buffer);
      hasLinkedAudioFile = types.QBool.read(buffer);
      mediaFilePath = types.QString.read(buffer);
      dataManagerType = types.QString.read(buffer);

      const numOfReadings = types.QInt.read(buffer);
      for (let i = 0; i < numOfReadings; i++) {
        readings.push(this.parseEntryFromBuffer(buffer));
      }
    } else {
      throw new BadRequestException(
        `Version de reading ${version} non supportée`,
      );
    }

    return {
      version,
      hasLinkedVideoFile,
      hasLinkedAudioFile,
      mediaFilePath,
      dataManagerType,
      readings,
    };
  }
}

