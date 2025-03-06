// ? #region SPECIAL KEYS
export enum ESpecialKeys {
  altKey = 'altKey',
  ctrlKey = 'ctrlKey',
  metaKey = 'metaKey',
  shiftKey = 'shiftKey'
}
export type TSpecialKeys = keyof typeof ESpecialKeys
// #endregion

// ? #region ORIGINS
export enum EOrigins {
  global = 'global',
  cmsEditor = 'cmsEditor',
  test = 'test'
}
export type TOrigins = keyof typeof EOrigins
export type TOriginPaths = {
  [key in TOrigins]: string[]
}
// #endregion

// ? #region TYPES
export enum ETypes {
  // Triggers on every matching keyup
  default = 'default',

  // Triggers on matching keydown, stops on keyup
  passive = 'passive'
}
export type TTypes = keyof typeof ETypes
// #endregions

// ? #region COMBINAISON / SHORTCUT
export interface ICombinaison {
  key: string,
  altMode?: boolean,
  specialKeys?: TSpecialKeys[]
}
export interface IShortcut {
  id?: string // Used to identity customShorcut and prevent duplicates

  description: string

  origin: TOrigins
  type: TTypes

  combinaisons: ICombinaison[]

  preserveAltMode?: boolean,
  bypassPreventDefault?: boolean,

  condition?: () => boolean,
  action?: () => void // Used in default export type shortcuts

  keydown?: () => void // Used in passive export type shortcuts
  keyup?: () => void // Used in passive export type shortcuts
}
// #endregion
