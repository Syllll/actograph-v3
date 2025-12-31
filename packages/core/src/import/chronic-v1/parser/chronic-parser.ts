import { CustomBuffer } from '../qtdatastream/src/buffer';
import qtdatastream from '../qtdatastream';
import { IChronicV1 } from '../types/chronic-v1.types';
import { ProtocolV1Parser } from './protocol-parser';
import { ReadingV1Parser } from './reading-parser';
import { ModeManagerV1Parser } from './mode-manager-parser';
import { GraphManagerV1Parser } from './graph-manager-parser';
import { ExtensionDataV1Parser } from './extension-data-parser';
import { ParseError, ValidationError } from '../../errors';

const types = qtdatastream.types;

/**
 * Parser principal pour les fichiers .chronic v1
 * 
 * Ce parser gère le parsing des fichiers binaires .chronic (format v1) qui utilisent
 * Qt DataStream pour la sérialisation.
 */
export class ChronicV1Parser {
  private protocolParser: ProtocolV1Parser;
  private readingParser: ReadingV1Parser;
  private modeManagerParser: ModeManagerV1Parser;
  private graphManagerParser: GraphManagerV1Parser;
  private extensionDataParser: ExtensionDataV1Parser;

  constructor() {
    this.protocolParser = new ProtocolV1Parser();
    this.readingParser = new ReadingV1Parser();
    this.modeManagerParser = new ModeManagerV1Parser();
    this.graphManagerParser = new GraphManagerV1Parser();
    this.extensionDataParser = new ExtensionDataV1Parser();
  }

  /**
   * Parse un fichier .chronic (v1) depuis un Buffer
   * @param buffer Buffer contenant le fichier binaire
   * @returns Objet IChronicV1 parsé
   * @throws ParseError si le format est invalide ou la version non supportée
   * @throws ValidationError si les données essentielles sont manquantes
   */
  public parse(buffer: Buffer): IChronicV1 {
    try {
      const customBuffer = new CustomBuffer(buffer);
      const version = types.QDouble.read(customBuffer);

      if (version !== 1 && version !== 2 && version !== 3) {
        throw new ParseError(
          `Version ${version} du format .chronic non supportée. Versions supportées: 1, 2, 3`,
          'chronic',
        );
      }

      let name: string = '';
      let protocol: IChronicV1['protocol'] | undefined;
      let reading: IChronicV1['reading'] | undefined;
      let hasSaveFile: boolean = false;
      let saveFile: string = '';
      let modeManager: IChronicV1['modeManager'] | undefined;
      let graphManager: IChronicV1['graphManager'] | undefined;
      let autoPosButtons = true;
      let extensionData: IChronicV1['extensionData'] = {
        version: 1.0,
        extensions: {},
      };
      let scaleFactor = 1;
      let buttonsWidth = 160 * scaleFactor;

      if (version === 1) {
        name = types.QString.read(customBuffer);
        protocol = this.protocolParser.parseFromBuffer(customBuffer);
        reading = this.readingParser.parseFromBuffer(customBuffer);
        hasSaveFile = types.QBool.read(customBuffer);
        saveFile = types.QString.read(customBuffer);
        modeManager = this.modeManagerParser.parseFromBuffer(customBuffer);
        graphManager = this.graphManagerParser.parseFromBuffer(customBuffer);
      } else if (version === 2) {
        name = types.QString.read(customBuffer);
        protocol = this.protocolParser.parseFromBuffer(customBuffer);
        reading = this.readingParser.parseFromBuffer(customBuffer);
        hasSaveFile = types.QBool.read(customBuffer);
        saveFile = types.QString.read(customBuffer);
        modeManager = this.modeManagerParser.parseFromBuffer(customBuffer);
        graphManager = this.graphManagerParser.parseFromBuffer(customBuffer);
        autoPosButtons = types.QBool.read(customBuffer);
        buttonsWidth = types.QDouble.read(customBuffer);
      } else if (version === 3) {
        name = types.QString.read(customBuffer);
        protocol = this.protocolParser.parseFromBuffer(customBuffer);
        reading = this.readingParser.parseFromBuffer(customBuffer);
        hasSaveFile = types.QBool.read(customBuffer);
        saveFile = types.QString.read(customBuffer);
        modeManager = this.modeManagerParser.parseFromBuffer(customBuffer);
        graphManager = this.graphManagerParser.parseFromBuffer(customBuffer);
        autoPosButtons = types.QBool.read(customBuffer);
        buttonsWidth = types.QDouble.read(customBuffer);
        extensionData = this.extensionDataParser.parseFromBuffer(customBuffer);
      }

      // Validate essential data
      if (!name) {
        throw new ValidationError(
          'Le fichier .chronic doit contenir un nom d\'observation',
        );
      }

      if (!protocol) {
        throw new ValidationError(
          'Le fichier .chronic doit contenir un protocole',
        );
      }

      if (!reading || !reading.readings) {
        throw new ValidationError(
          'Le fichier .chronic doit contenir des readings',
        );
      }

      return {
        version,
        name,
        protocol: protocol!,
        reading: reading!,
        hasSaveFile,
        saveFile,
        modeManager: modeManager!,
        graphManager: graphManager!,
        autoPosButtons,
        extensionData,
        scaleFactor,
        buttonsWidth,
      };
    } catch (error) {
      if (error instanceof ParseError || error instanceof ValidationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ParseError(
        `Erreur lors du parsing du fichier .chronic: ${errorMessage}`,
        'chronic',
      );
    }
  }
}

