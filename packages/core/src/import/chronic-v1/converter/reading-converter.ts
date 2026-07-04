import { ReadingTypeEnum } from '../../../enums';
import { IReadingEntryV1 } from '../types/chronic-v1.types';
import { ValidationError } from '../../errors';
import { INormalizedReading } from '../../types';

/**
 * Convertisseur pour transformer les readings v1 en format normalisé pour v3
 * 
 * Ce convertisseur transforme les readings du format v1 (qui utilisent un champ 'flag')
 * vers le format v3 (qui utilise ReadingTypeEnum).
 */
export class ReadingV1Converter {
  /**
   * Mappe le flag v1 vers ReadingTypeEnum
   */
  private mapFlagToType(flag: string): ReadingTypeEnum {
    const flagLower = flag.toLowerCase().trim();

    switch (flagLower) {
      case 'start':
        return ReadingTypeEnum.START;
      case 'stop':
        return ReadingTypeEnum.STOP;
      case 'pause_start':
      case 'pausestart':
        return ReadingTypeEnum.PAUSE_START;
      case 'pause_end':
      case 'pauseend':
        return ReadingTypeEnum.PAUSE_END;
      case 'data':
        return ReadingTypeEnum.DATA;
      default:
        return ReadingTypeEnum.DATA;
    }
  }

  /**
   * Convertit les readings v1 en format normalisé pour création
   */
  public convert(readings: IReadingEntryV1[]): INormalizedReading[] {
    if (!readings || !Array.isArray(readings)) {
      throw new ValidationError('Les readings doivent être un tableau valide');
    }

    return readings.map((entry, index) => {
      // Certains fichiers .chronic v1 contiennent des relevés avec un nom vide
      // (ex: relevé data sans observable). Plutôt que de rejeter tout l'import,
      // on utilise un nom de repli pour préserver l'horodatage et le type.
      const name = entry.name && entry.name.length > 0
        ? entry.name
        : `Relevé ${index + 1}`;

      if (!entry.time || !(entry.time instanceof Date)) {
        throw new ValidationError(
          `Le reading à l'index ${index} doit avoir une date valide`,
        );
      }

      const type = this.mapFlagToType(entry.flag || 'data');

      return {
        name,
        description: undefined,
        type,
        dateTime: entry.time,
      };
    });
  }
}

