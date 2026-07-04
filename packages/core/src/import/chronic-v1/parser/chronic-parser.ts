import { CustomBuffer } from '../qtdatastream/src/buffer';
import types from '../qtdatastream/src/types';
import {
  IChronicV1,
  IGraphManagerV1,
  IExtensionDataV1,
} from '../types/chronic-v1.types';
import { ProtocolV1Parser } from './protocol-parser';
import { ReadingV1Parser } from './reading-parser';
import { ModeManagerV1Parser } from './mode-manager-parser';
import { GraphManagerV1Parser } from './graph-manager-parser';
import { ExtensionDataV1Parser } from './extension-data-parser';
import { ParseError, ValidationError } from '../../errors';

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
   * Valeurs par défaut pour les métadonnées de graphique.
   * Le graphManager n'est pas utilisé lors de l'import v3 (les métadonnées du
   * graphique sont réinitialisées côté v3), on se contente donc d'une structure
   * vide valide.
   */
  private readonly DEFAULT_GRAPH_MANAGER: IGraphManagerV1 = {
    version: 1,
    layers: [],
  };

  private readonly DEFAULT_EXTENSION_DATA: IExtensionDataV1 = {
    version: 1.0,
    extensions: {},
  };

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

      const name = types.QString.read(customBuffer);
      const protocol: IChronicV1['protocol'] | undefined =
        this.protocolParser.parseFromBuffer(customBuffer);
      const reading: IChronicV1['reading'] | undefined =
        this.readingParser.parseFromBuffer(customBuffer);
      const hasSaveFile = types.QBool.read(customBuffer);
      const saveFile = types.QString.read(customBuffer);
      const modeManager: IChronicV1['modeManager'] | undefined =
        this.modeManagerParser.parseFromBuffer(customBuffer);

      // Queue dépendant de la version : graphManager (v1), + autoPosButtons et
      // buttonsWidth (v2/v3), + extensionData (v3). Tous non essentiels à l'import
      // et lus de façon tolérante.
      let graphManager: IChronicV1['graphManager'] = {
        ...this.DEFAULT_GRAPH_MANAGER,
      };
      let autoPosButtons = true;
      let buttonsWidth = 160;
      let extensionData: IChronicV1['extensionData'] = {
        ...this.DEFAULT_EXTENSION_DATA,
      };

      if (version === 1) {
        graphManager = this.parseGraphManagerTolerant(customBuffer);
      } else if (version === 2 || version === 3) {
        const tail = this.parseGraphTailTolerant(customBuffer, version);
        graphManager = tail.graphManager;
        autoPosButtons = tail.autoPosButtons;
        buttonsWidth = tail.buttonsWidth;
        if (version === 3) {
          extensionData = tail.extensionData;
        }
      }

      const scaleFactor = 1;

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
        graphManager,
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

  /**
   * Tente de parser le graphManager. Cette métadonnée n'est pas utilisée à l'import
   * v3 (le graphique est réinitialisé par conception), et son format binaire varie
   * selon les versions du writer Qt. Le parser sous-jacent est incomplet vis-à-vis
   * du format GraphPainter v1.0 réel : il est donc attendu qu'il lève ici sur la
   * plupart des fichiers. C'est un mécanisme « best effort » : si le parser est
   * un jour complété, il consommera les bons octets et les champs suivants
   * (autoPosButtons, buttonsWidth, extensionData) seront lus correctement. En
   * attendant, on réinitialise la valeur plutôt que d'abandonner tout l'import.
   */
  private parseGraphManagerTolerant(
    buffer: typeof CustomBuffer.prototype,
  ): IGraphManagerV1 {
    try {
      return this.graphManagerParser.parseFromBuffer(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // debug (et non warn) : le reset du graph est un comportement attendu.
      console.debug(
        `[chronic-v1] graphManager réinitialisé: ${message}`,
      );
      return { ...this.DEFAULT_GRAPH_MANAGER };
    }
  }

  /**
   * Lit les champs qui suivent le graphManager (autoPosButtons, buttonsWidth, et
   * extensionData pour la v3). Comme le graphManager peut laisser le pointeur de
   * lecture désaligné, chaque champ est lu de façon tolérante : en cas d'erreur
   * (désalignement ou buffer épuisé), on conserve la valeur par défaut.
   */
  private parseGraphTailTolerant(
    buffer: typeof CustomBuffer.prototype,
    chronicVersion: 2 | 3,
  ): {
    graphManager: IGraphManagerV1;
    autoPosButtons: boolean;
    buttonsWidth: number;
    extensionData: IExtensionDataV1;
  } {
    const graphManager = this.parseGraphManagerTolerant(buffer);

    const autoPosButtons = this.readWithDefault(
      () => types.QBool.read(buffer),
      true,
      'autoPosButtons',
    );
    const buttonsWidth = this.readWithDefault(
      () => types.QDouble.read(buffer),
      160,
      'buttonsWidth',
    );

    const extensionData =
      chronicVersion === 3
        ? this.parseExtensionDataTolerant(buffer)
        : { ...this.DEFAULT_EXTENSION_DATA };

    return { graphManager, autoPosButtons, buttonsWidth, extensionData };
  }

  /**
   * Exécute une lecture et retourne une valeur par défaut en cas d'erreur.
   * Utilisé pour les métadonnées non essentielles situées après le graphManager,
   * dont le pointeur de lecture peut être désaligné.
   */
  private readWithDefault<T>(
    read: () => T,
    defaultValue: T,
    label: string,
  ): T {
    try {
      return read();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.debug(`[chronic-v1] ${label} réinitialisé: ${message}`);
      return defaultValue;
    }
  }

  /**
   * Tente de parser l'extensionData. Non utilisé à l'import v3 ; tolérant aux
   * erreurs pour la même raison que le graphManager.
   */
  private parseExtensionDataTolerant(
    buffer: typeof CustomBuffer.prototype,
  ): IExtensionDataV1 {
    try {
      return this.extensionDataParser.parseFromBuffer(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.debug(
        `[chronic-v1] extensionData réinitialisé: ${message}`,
      );
      return { ...this.DEFAULT_EXTENSION_DATA };
    }
  }
}

