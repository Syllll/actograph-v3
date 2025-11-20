import { BadRequestException } from '@nestjs/common';
import { CustomBuffer } from '../qtdatastream/src/buffer';
import qtdatastream from '../qtdatastream';
import { IChronicV1 } from '../types/chronic-v1.types';
import { ProtocolV1Parser } from './protocol-parser';
import { ReadingV1Parser } from './reading-parser';
import { ModeManagerV1Parser } from './mode-manager-parser';
import { GraphManagerV1Parser } from './graph-manager-parser';
import { ExtensionDataV1Parser } from './extension-data-parser';

const types = qtdatastream.types;

/**
 * Parser principal pour les fichiers .chronic v1
 * 
 * Ce parser gère le parsing des fichiers binaires .chronic (format v1) qui utilisent
 * Qt DataStream pour la sérialisation. Le format .chronic est un format legacy
 * provenant de la version 1 d'ActoGraph.
 * 
 * Processus de parsing :
 * 1. Lecture séquentielle du buffer binaire avec gestion de la position de lecture
 * 2. Détection de la version du format (1, 2 ou 3)
 * 3. Parsing des différentes sections selon la version :
 *    - Version 1 : Structure de base (name, protocol, reading, modeManager, graphManager)
 *    - Version 2 : Ajout de autoPosButtons et buttonsWidth
 *    - Version 3 : Ajout de extensionData
 * 4. Validation des données essentielles (name, protocol, readings)
 * 5. Retour de la structure IChronicV1 complète
 * 
 * Le parsing utilise la bibliothèque qtdatastream qui implémente le protocole
 * Qt DataStream pour Node.js, permettant de lire les types Qt (QString, QInt, QDouble, etc.)
 * depuis un buffer binaire.
 * 
 * @see IChronicV1 - Structure de données parsée
 * @see qtdatastream - Bibliothèque pour parser Qt DataStream
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
   * @throws BadRequestException si le format est invalide ou la version non supportée
   */
  public parse(buffer: Buffer): IChronicV1 {
    try {
      // Créer un CustomBuffer depuis le Buffer pour gérer la position de lecture
      const customBuffer = new CustomBuffer(buffer);

      // Lire la version du fichier
      const version = types.QDouble.read(customBuffer);

      // Valider la version
      if (version !== 1 && version !== 2 && version !== 3) {
        throw new BadRequestException(
          `Version ${version} du format .chronic non supportée. Versions supportées: 1, 2, 3`,
        );
      }

      // Variables pour stocker les données parsées
      // Initialisation avec des valeurs par défaut pour satisfaire TypeScript
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

      // Parser selon la version du format
      // Chaque version ajoute des champs supplémentaires
      // Version 1 : Structure de base
      if (version === 1) {
        name = types.QString.read(customBuffer);
        protocol = this.protocolParser.parseFromBuffer(customBuffer);
        reading = this.readingParser.parseFromBuffer(customBuffer);
        hasSaveFile = types.QBool.read(customBuffer);
        saveFile = types.QString.read(customBuffer);
        modeManager = this.modeManagerParser.parseFromBuffer(customBuffer);
        graphManager = this.graphManagerParser.parseFromBuffer(customBuffer);
      // Version 2 : Ajout de autoPosButtons et buttonsWidth
      } else if (version === 2) {
        name = types.QString.read(customBuffer);
        protocol = this.protocolParser.parseFromBuffer(customBuffer);
        reading = this.readingParser.parseFromBuffer(customBuffer);
        hasSaveFile = types.QBool.read(customBuffer);
        saveFile = types.QString.read(customBuffer);
        modeManager = this.modeManagerParser.parseFromBuffer(customBuffer);
        graphManager = this.graphManagerParser.parseFromBuffer(customBuffer);
        autoPosButtons = types.QBool.read(customBuffer); // Nouveau en v2
        buttonsWidth = types.QDouble.read(customBuffer); // Nouveau en v2
      // Version 3 : Ajout de extensionData
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

      // Valider les données essentielles (après parsing)
      if (!name) {
        throw new BadRequestException(
          'Le fichier .chronic doit contenir un nom d\'observation',
        );
      }

      if (!protocol) {
        throw new BadRequestException(
          'Le fichier .chronic doit contenir un protocole',
        );
      }

      if (!reading || !reading.readings) {
        throw new BadRequestException(
          'Le fichier .chronic doit contenir des readings',
        );
      }

      // TypeScript nécessite une assertion ici car il ne peut pas garantir
      // que protocol et reading sont définis même après les vérifications
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
      // Si c'est déjà une BadRequestException, la relancer
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Sinon, encapsuler l'erreur dans une BadRequestException
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Erreur lors du parsing du fichier .chronic: ${errorMessage}`,
      );
    }
  }
}

