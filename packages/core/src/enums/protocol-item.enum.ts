/**
 * Types of protocol items
 */
export enum ProtocolItemTypeEnum {
  Category = 'category',
  Observable = 'observable',
}

/**
 * Actions for observables (how they behave)
 */
export enum ProtocolItemActionEnum {
  Continuous = 'continuous',
  Discrete = 'discrete',
}

/**
 * Background patterns for graph visualization
 */
export enum BackgroundPatternEnum {
  /** Aucun motif - couleur unie */
  Solid = 'solid',
  /** Lignes horizontales */
  Horizontal = 'horizontal',
  /** Lignes verticales */
  Vertical = 'vertical',
  /** Lignes diagonales (/) */
  Diagonal = 'diagonal',
  /** Grille (horizontal + vertical) */
  Grid = 'grid',
  /** Pointillés */
  Dots = 'dots',
}

/**
 * Display modes for categories in graphs
 */
export enum DisplayModeEnum {
  /** Mode normal : traits horizontaux (step-lines) */
  Normal = 'normal',
  /** Mode arrière-plan : zones colorées sur le fond du graphique (catégorie retirée de l'axe Y) */
  Background = 'background',
  /** Mode frise : bandeau horizontal découpé en zones colorées (catégorie visible sur l'axe Y) */
  Frieze = 'frieze',
}

