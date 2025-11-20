import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IModeManagerV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

const types = qtdatastream.types;

/**
 * Parse le mode manager depuis un buffer Qt DataStream
 */
export class ModeManagerV1Parser {
  /**
   * Convertit un nombre en mode
   */
  private modeFromNumber(mode: number): 'calendar' | 'chronometer' {
    if (mode === 0) {
      return 'chronometer';
    } else if (mode === 1) {
      return 'calendar';
    } else {
      throw new BadRequestException(`Mode ${mode} non supporté`);
    }
  }

  /**
   * Parse le mode manager depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Mode manager parsé
   */
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IModeManagerV1 {
    const currentModeAsNumber = types.QUInt.read(buffer);
    const currentMode = this.modeFromNumber(currentModeAsNumber);

    return {
      currentMode,
    };
  }
}

