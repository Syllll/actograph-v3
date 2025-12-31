/**
 * Types TypeScript pour le format .chronic v1
 * Ces types correspondent à la structure binaire du fichier .chronic
 */

/**
 * Structure principale d'un fichier .chronic v1
 */
export interface IChronicV1 {
  version: number;
  name: string;
  protocol: IProtocolNodeV1;
  reading: IReadingV1;
  hasSaveFile: boolean;
  saveFile: string;
  modeManager: IModeManagerV1;
  graphManager: IGraphManagerV1;
  autoPosButtons: boolean;
  extensionData: IExtensionDataV1;
  scaleFactor: number;
  buttonsWidth: number;
}

/**
 * Nœud de protocole (structure hiérarchique récursive)
 */
export interface IProtocolNodeV1 {
  version?: number;
  name: string;
  type: string;
  isRootNode: boolean;
  colorName: string;
  shape: string;
  thickness: number;
  isVisible: boolean;
  indexInParentContext: number;
  isBackground: boolean;
  backgroundCover: string;
  backgroundMotif: number;
  bX: number;
  bY: number;
  bWidth: number;
  bHeight: number;
  children: IProtocolNodeV1[];
}

/**
 * Structure des readings
 */
export interface IReadingV1 {
  version?: number;
  hasLinkedVideoFile: boolean;
  hasLinkedAudioFile: boolean;
  mediaFilePath: string;
  dataManagerType: string;
  readings: IReadingEntryV1[];
}

/**
 * Entrée de reading individuelle
 */
export interface IReadingEntryV1 {
  version?: number;
  id: number;
  name: string;
  flag: string;
  time: Date;
}

/**
 * Gestionnaire de mode
 */
export interface IModeManagerV1 {
  currentMode: 'calendar' | 'chronometer';
}

/**
 * Gestionnaire de graphique
 */
export interface IGraphManagerV1 {
  version?: number;
  layers: IGraphManagerLayerV1[];
}

/**
 * Couche du gestionnaire de graphique
 */
export interface IGraphManagerLayerV1 {
  [key: string]: unknown;
}

/**
 * Données d'extension
 */
export interface IExtensionDataV1 {
  version: number;
  extensions: {
    [key: string]: unknown;
  };
}

