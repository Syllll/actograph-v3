import { INode } from '../../tree/types';
import { IDragSharedState } from './drag.interface';
import { EDrawerTypes, IDrawer, IDrawerSharedState } from './drawers.interface';

export enum ESources {
  parent = 'parent',
  iframe = 'iframe',
}
// export type TSources = keyof typeof ESources

export enum EUpdateType {
  change = 'change',
  sync = 'sync',
}
// export type TUpdateType = keyof typeof EUpdateType

// export enum EComposables {
//   tree = 'tree',
//   drawers = 'drawers',
//   shortcuts = 'shortcuts',
// }
// export type TComposables = keyof typeof EComposables

export interface IContentUpdateSelection {
  selectedId?: number;
}

export interface IContentUpdatePageBuilderJson {
  pageBuilderJson: INode | null;
}

export interface IDrawerUpdateState {
  type: EDrawerTypes;

  show?: boolean;
  active?: boolean;
  sticky?: boolean;
}

export enum ESyncPingpongType {
  ping = 'ping',
  pong = 'pong',
}

export enum ESyncMessageType {
  // _ Check the communicaiton is working
  ping = 'ping',
  pong = 'pong',

  // _ Update the pageBuilderJson (the content of the page builder)
  updatePageBuilderJson = 'updatePageBuilderJson',

  // _ The selection was updated
  updateSelection = 'updateSelection',

  // _ Composables shared states
  drawers = 'drawers',
  drawerLeft = EDrawerTypes.left,
  drawerRight = EDrawerTypes.right,

  // _ Components actions
  // * drag/drop from drawer
  drag = 'drag',
  drop = 'drop',
  // * create from component modal
  create = 'create',
}

// Every possible message content
export interface ISyncMessageContent
  extends Partial<IContentUpdateSelection>,
    Partial<IContentUpdatePageBuilderJson>,
    // Drawers
    // Partial<IDrawerSharedState>,
    Partial<IDrawerUpdateState>,
    // DragCard
    Partial<IDragSharedState> {}

export interface ISyncMessage {
  type: ESyncMessageType;
  content?: ISyncMessageContent;
}

export interface ISyncParsedMessage {
  type: ESyncMessageType;
  content?: string;
}
