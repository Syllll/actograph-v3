import { UnwrapNestedRefs, reactive } from 'vue';
import { INode } from './types';
// import { ESources } from '../ui/interfaces/iframe.interface';

export interface ISharedState {
  // ? STATE
  readonly?: boolean;
  outline?: boolean;

  // ? DATAS
  // softSelected: INode | null; // Allow a single click on the element before openning the drawer
  selected: INode | null | undefined;
  copiedNode: INode | null | undefined;

  pageBuilderJson: INode | null;

  // __source?: ESources
}

const sharedStates = {} as {
  [key: string]: UnwrapNestedRefs<ISharedState>;
};

export const useSharedStates = () => {
  const methods = {
    get: (key: string) => {
      if (!methods.hasKey(key)) {
        throw new Error(`The key ${key} does not exist`);
      }

      return sharedStates[key];
    },
    editableTreeId: (): string | null => {
      const editableEntry = Object.entries(sharedStates).find(
        (e: any[]) => e[1].readonly === false
      );
      return editableEntry?.[0] ?? null;
    },
    create: (key: string, readonly?: boolean) => {
      if (methods.hasKey(key)) {
        throw new Error(`The key ${key} already exists`);
      }

      const newState = reactive({
        readonly,
        outline: false,

        softSelected: null,
        selected: null,
        copiedNode: null,

        pageBuilderJson: null,
      });

      sharedStates[key] = newState;

      const numOfSharedStates = Object.keys(sharedStates).length;
      if (numOfSharedStates > 30) {
        console.warn(
          `page-builder/use-shared-states: There are ${numOfSharedStates} shared states. This could be a sign of a memory leak.`
        );
      }

      return sharedStates[key];
    },
    remove: (key: string) => {
      delete sharedStates[key];
    },
    keys: () => {
      return Object.keys(sharedStates);
    },
    hasKey: (key: string) => {
      return sharedStates[key] !== undefined;
    },
  };

  return {
    sharedStates,
    methods,
  };
};
