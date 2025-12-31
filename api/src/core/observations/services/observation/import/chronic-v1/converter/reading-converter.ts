import { ReadingTypeEnum } from '@actograph/core';
import { IReadingEntryV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

/**
 * Convertisseur pour transformer les readings v1 en format normalisé pour v3
 * 
 * Ce convertisseur transforme les readings du format v1 (qui utilisent un champ 'flag')
 * vers le format v3 (qui utilise ReadingTypeEnum).
 * 
 * Transformations effectuées :
 * - flag → type : Conversion du flag v1 vers ReadingTypeEnum
 * - name : Conservé tel quel
 * - time → dateTime : Conservé tel quel (déjà un objet Date)
 * - description : Non disponible dans v1, laissé à undefined
 * 
 * Mapping des flags :
 * - 'start' → ReadingTypeEnum.START
 * - 'stop' → ReadingTypeEnum.STOP
 * - 'pause_start' / 'pausestart' → ReadingTypeEnum.PAUSE_START
 * - 'pause_end' / 'pauseend' → ReadingTypeEnum.PAUSE_END
 * - 'data' → ReadingTypeEnum.DATA
 * - Autres → ReadingTypeEnum.DATA (par défaut)
 */
export class ReadingV1Converter {
  /**
   * Mappe le flag v1 vers ReadingTypeEnum
   * 
   * Le format v1 utilise des flags textuels pour identifier le type de reading,
   * tandis que v3 utilise un enum strict. Cette méthode effectue la conversion
   * en gérant les variations possibles (casse, underscores, etc.).
   * 
   * @param flag Flag du reading v1 (ex: 'start', 'stop', 'data', etc.)
   * @returns ReadingTypeEnum correspondant
   */
  private mapFlagToType(flag: string): ReadingTypeEnum {
    // Normaliser le flag (minuscules, sans espaces)
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
        // Par défaut, on utilise DATA pour les flags inconnus
        // On pourrait aussi logger un avertissement ici
        return ReadingTypeEnum.DATA;
    }
  }

  /**
   * Convertit les readings v1 en format normalisé pour création
   * @param readings Liste des readings v1
   * @returns Format normalisé pour création
   */
  public convert(
    readings: IReadingEntryV1[],
  ): Array<{
    name: string;
    description?: string;
    type: ReadingTypeEnum;
    dateTime: Date;
  }> {
    if (!readings || !Array.isArray(readings)) {
      throw new BadRequestException(
        'Les readings doivent être un tableau valide',
      );
    }

    return readings.map((entry, index) => {
      // Valider les champs essentiels
      if (!entry.name) {
        throw new BadRequestException(
          `Le reading à l'index ${index} doit avoir un nom`,
        );
      }

      if (!entry.time || !(entry.time instanceof Date)) {
        throw new BadRequestException(
          `Le reading à l'index ${index} doit avoir une date valide`,
        );
      }

      // Convertir le flag en type
      const type = this.mapFlagToType(entry.flag || 'data');

      return {
        name: entry.name,
        description: undefined, // Le format v1 n'a pas de description
        type,
        dateTime: entry.time,
      };
    });
  }
}

