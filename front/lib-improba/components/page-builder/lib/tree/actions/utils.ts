import { INode } from '../types';

export enum ActionTypeEnum {
  Add = 'add',
  Remove = 'remove',
  Reorder = 'reorder',
  Paste = 'paste',
}

export interface IAction {
  type: ActionTypeEnum;
  targetId: number;
  data?: {
    nodeToBePasted?: any;
    name?: string;
    component?: string;
    slot: string;
    order?: number; // To change the order
  };
}

export const createChild = (options: {
  id: number;
  name: string;
  slot: string;
}) => {
  return {
    id: options.id,
    name: options.name,
    slot: options.slot,
    props: {},
    children: [],
  };
};

export const upJsonTreeMaxId = (jsonTree: INode) => {
  jsonTree._maxId = <number>jsonTree._maxId + 1;
};
