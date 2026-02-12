import { ObservationService } from '../index.service';
import { BadRequestException } from '@nestjs/common';
import {
  parseJchronicFile,
  normalizeJchronicData,
  ImportError,
  type IJchronicImport,
  type IChronicV1,
  type INormalizedImport,
} from '@actograph/core';
// ChronicV1Parser requires Node.js streams - import directly from chronic-v1 submodule
import {
  ChronicV1Parser,
  normalizeChronicV1Data,
} from '@actograph/core/import/chronic-v1';

/**
 * Interface for parsed chronic v1 data wrapper
 */
interface IChronicV1Wrapper {
  chronic: IChronicV1;
}

/**
 * Import class - Orchestrates file import operations
 * 
 * Uses pure parsing/normalization functions from @actograph/core
 * and handles database operations via NestJS services.
 */
export class Import {
  private chronicV1Parser: ChronicV1Parser;

  constructor(
    private readonly observationService: ObservationService,
  ) {
    this.chronicV1Parser = new ChronicV1Parser();
  }

  /**
   * Parse le contenu d'un fichier et détecte son format
   * 
   * @param fileContent Contenu du fichier (string pour .jchronic, Buffer pour .chronic)
   * @param fileName Nom du fichier (pour détecter l'extension)
   * @returns Objet avec le format détecté et les données parsées
   * @throws BadRequestException si le format est invalide
   */
  public parseFile(
    fileContent: string | Buffer,
    fileName: string,
  ): { format: 'jchronic' | 'chronic'; data: IJchronicImport | IChronicV1Wrapper } {
    const extension = fileName.toLowerCase().endsWith('.jchronic')
      ? 'jchronic'
      : 'chronic';

    try {
      if (extension === 'jchronic') {
        // FORMAT .jchronic (v3) : Format JSON
        if (Buffer.isBuffer(fileContent)) {
          fileContent = fileContent.toString('utf-8');
        }
        
        const data = parseJchronicFile(fileContent as string);
        return { format: 'jchronic', data };
      } else {
        // FORMAT .chronic (v1) : Format binaire Qt DataStream
        if (typeof fileContent === 'string') {
          fileContent = Buffer.from(fileContent, 'binary');
        }
        
        const chronic = this.chronicV1Parser.parse(fileContent as Buffer);
        return { format: 'chronic', data: { chronic } };
      }
    } catch (error) {
      // Convert core errors to NestJS BadRequestException
      if (error instanceof ImportError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Erreur lors du parsing : ${errorMessage}`);
    }
  }

  /**
   * Normalise les données importées pour créer une observation
   * 
   * @param parsedData Données parsées depuis le fichier
   * @param format Format du fichier source
   * @returns Données normalisées pour création d'observation
   */
  public normalizeImportData(
    parsedData: IJchronicImport | IChronicV1Wrapper,
    format: 'jchronic' | 'chronic',
  ): INormalizedImport {
    try {
      if (format === 'jchronic') {
        return normalizeJchronicData(parsedData as IJchronicImport);
      } else {
        const wrapper = parsedData as IChronicV1Wrapper;
        return normalizeChronicV1Data(wrapper.chronic);
      }
    } catch (error) {
      if (error instanceof ImportError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Génère un nom unique pour une observation importée
   */
  private async generateUniqueObservationName(
    originalName: string,
    userId: number,
  ): Promise<string> {
    const existingObservations = await this.observationService.find.findAllForUser(userId);
    const nameExists = existingObservations.some(
      (obs) => obs.name === originalName,
    );

    if (!nameExists) {
      return originalName;
    }

    let candidateName = `Copie de ${originalName}`;
    let copyNumber = 1;

    while (existingObservations.some((obs) => obs.name === candidateName)) {
      copyNumber++;
      candidateName = `Copie (${copyNumber}) de ${originalName}`;
    }

    return candidateName;
  }

  /**
   * Importe une observation depuis un fichier .jchronic ou .chronic
   * 
   * @param fileContent Contenu du fichier
   * @param fileName Nom du fichier
   * @param userId ID de l'utilisateur
   * @returns Observation créée
   */
  public async importFromFile(
    fileContent: string | Buffer,
    fileName: string,
    userId: number,
  ) {
    // Parse file
    const { format, data } = this.parseFile(fileContent, fileName);

    // Normalize data
    const normalizedData = this.normalizeImportData(data, format);

    // Generate unique name
    const uniqueName = await this.generateUniqueObservationName(
      normalizedData.observation.name,
      userId,
    );

    // Create observation
    const observation = await this.observationService.create({
      userId,
      name: uniqueName,
      description: normalizedData.observation.description,
      protocol: normalizedData.protocol,
      readings: normalizedData.readings,
    });

    return observation;
  }
}
