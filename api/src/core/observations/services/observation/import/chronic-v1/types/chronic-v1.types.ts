/**
 * Types TypeScript pour le format .chronic v1
 * Ces types correspondent à la structure binaire du fichier .chronic
 */

/**
 * Structure principale d'un fichier .chronic v1
 */
export interface IChronicV1 {
  version: number; // Version du format (1, 2 ou 3)
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
  type: string; // 'category', 'observable', 'root'
  isRootNode: boolean;
  colorName: string;
  shape: string;
  thickness: number;
  isVisible: boolean;
  indexInParentContext: number;
  isBackground: boolean;
  backgroundCover: string;
  backgroundMotif: number;
  bX: number; // Position X (version 2+)
  bY: number; // Position Y (version 2+)
  bWidth: number; // Largeur (version 2+)
  bHeight: number; // Hauteur (version 2+)
  children: IProtocolNodeV1[]; // Enfants (récursif)
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
  id: number; // ID (version 3 uniquement, -1 sinon)
  name: string;
  flag: string; // Type du reading ('start', 'stop', 'data', etc.)
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
  // Structure simplifiée - les détails complets sont dans graph-manager/
  [key: string]: any;
}

/**
 * Données d'extension
 */
export interface IExtensionDataV1 {
  version: number;
  extensions: {
    [key: string]: any;
  };
}

