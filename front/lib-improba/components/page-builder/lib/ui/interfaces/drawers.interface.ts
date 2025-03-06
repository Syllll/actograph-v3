export enum EDrawerTypes {
  left = 'left',
  right = 'right'
}
export type TDrawerTypes = keyof typeof EDrawerTypes

export interface IDrawerState {
  active: boolean,
  show: boolean,
  sticky: boolean,
}

export interface IDrawer extends IDrawerState {
  width: string

  currentTab?: string // Used in the left drawer tabs control
}

export interface ITab {
  name: string
  label: string

  shortcut: string
}

export interface IDrawerSharedState {
  [EDrawerTypes.left]: IDrawer
  [EDrawerTypes.right]: IDrawer

  frame: {
    minWidth: number,
    minHeight: number,

    width: string,
    height: string,
  }
}