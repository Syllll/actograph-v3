import types from '../qtdatastream/src/types';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import { IReadingV1, IReadingEntryV1 } from '../types/chronic-v1.types';
import { ParseError } from '../../errors';

/**
 * Parse les readings depuis un buffer Qt DataStream
 */
export class ReadingV1Parser {
  /**
   * Parse une entrée de reading depuis le buffer
   * @param buffer Buffer avec position de lecture
   * @returns Entrée de reading parsée
   */
  private parseEntryFromBuffer(buffer: typeof CustomBuffer.prototype): IReadingEntryV1 {
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
      throw new ParseError(
        `Version de reading entry ${version} non supportée`,
        'chronic',
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
  public parseFromBuffer(buffer: typeof CustomBuffer.prototype): IReadingV1 {
    const version = types.QDouble.read(buffer);
    let hasLinkedVideoFile: boolean;
    let hasLinkedAudioFile: boolean;
    let mediaFilePath: string;
    let dataManagerType: string;
    const readings: IReadingEntryV1[] = [];

    if (version === 1 || version === 2) {
      // Versions 1 et 2 : pas de champ dataManagerType (cf. DataList::operator>>
      // du format .chronic v1). La métadonnée n'existe pas, on laisse une chaîne
      // vide.
      hasLinkedVideoFile = types.QBool.read(buffer);
      hasLinkedAudioFile = types.QBool.read(buffer);
      mediaFilePath = types.QString.read(buffer);
      dataManagerType = '';

      const numOfReadings = types.QInt.read(buffer);
      for (let i = 0; i < numOfReadings; i++) {
        readings.push(this.parseEntryFromBuffer(buffer));
      }
    } else if (version === 3) {
      // Version 3 : un champ dataManagerType ("RAM" ou "SQL") précède les
      // readings. Seul le mode RAM contient les readings en ligne ; le mode SQL
      // stocke les données dans une base embarquée qu'on n'extrait pas à l'import.
      hasLinkedVideoFile = types.QBool.read(buffer);
      hasLinkedAudioFile = types.QBool.read(buffer);
      mediaFilePath = types.QString.read(buffer);
      dataManagerType = types.QString.read(buffer);

      if (dataManagerType === 'RAM') {
        const numOfReadings = types.QInt.read(buffer);
        for (let i = 0; i < numOfReadings; i++) {
          readings.push(this.parseEntryFromBuffer(buffer));
        }
      } else if (dataManagerType === 'SQL') {
        // Skip the embedded SQLite database: qint64 fileSize, qint64 chunkSize,
        // puis une série de QByteArray. On ignore ces données (les readings ne
        // sont pas accessibles sans extraire la base).
        const fileSize = types.QInt64.read(buffer);
        const chunkSize = types.QInt64.read(buffer);
        // Best-effort skip ; ne pas échouer même si la structure est imprécise.
        this.skipSqlChunks(buffer, fileSize, chunkSize);
      } else {
        throw new ParseError(
          `Type de data manager ${dataManagerType} non supporté`,
          'chronic',
        );
      }
    } else {
      throw new ParseError(
        `Version de reading ${version} non supportée`,
        'chronic',
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

  /**
   * Tente de sauter les chunks QByteArray embarqués pour un data manager SQL.
   * Best-effort : en cas d'erreur ou de dépassement, on stoppe sans faire planter
   * l'import (les readings SQL ne sont pas extraits à l'import v3).
   */
  private skipSqlChunks(
    buffer: typeof CustomBuffer.prototype,
    fileSize: number,
    chunkSize: number,
  ): void {
    if (
      !isFinite(fileSize) ||
      !isFinite(chunkSize) ||
      chunkSize <= 0 ||
      fileSize <= 0
    ) {
      return;
    }
    // Cap conservateur : un QByteArray consomme au minimum 4 octets (son QUInt de
    // taille). On borne le nombre d'itérations pour rester dans le buffer et
    // éviter toute boucle excessive si fileSize/chunkSize est aberrant.
    const remaining = buffer.remaining();
    const maxIterations = remaining ? Math.floor(remaining.length / 4) : 0;
    const chunks = Math.min(Math.ceil(fileSize / chunkSize), maxIterations);
    try {
      for (let i = 0; i < chunks; i++) {
        types.QByteArray.read(buffer);
      }
    } catch {
      // Ignore : les métadonnées de lecture ne sont pas essentielles.
    }
  }
}

