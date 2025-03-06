import { UnwrapNestedRefs, reactive } from 'vue';
import { ISharedState, useSharedStates } from './use-shared-states';
import * as actions from './actions';
import config from './../config';
import { INode } from './types';

const _findNodeByIdRecursively = (id: string) => {
  const sharedStates = useSharedStates();
  const sharedState = sharedStates.methods.get(id);

  const findNodeByIdRecursively = (
    id: number,
    jsonTreeArg: INode | null = null
  ): { node: INode; parentNode?: INode } | null => {
    let jsonTree = jsonTreeArg;
    if (!jsonTreeArg) {
      jsonTree = sharedState.pageBuilderJson;
    }

    if (!jsonTree) {
      throw new Error(
        'use-tree/findNodeByIdRecursively: jsonTree is undefined'
      );
    }

    if (jsonTree.id === id) {
      return {
        node: jsonTree,
        parentNode: undefined,
      };
    }

    if (jsonTree.children) {
      for (let i = 0; i < jsonTree.children.length; i++) {
        const child = jsonTree.children[i];

        if (child.id === id) {
          return {
            node: child,
            parentNode: jsonTree,
          };
        }
      }

      for (let i = 0; i < jsonTree.children.length; i++) {
        const child = jsonTree.children[i];
        const result = findNodeByIdRecursively(id, child);
        if (result?.node) {
          return {
            node: result.node,
            parentNode: result.parentNode,
          };
        }
      }
    }

    return null;
  };

  return findNodeByIdRecursively;
};

const findComponentByName = (name: string) => {
  const compo = config.components[name];
  if (!compo) {
    throw new Error(
      `use-tree/findComponentByName: compo not found for ${name}`
    );
  }

  return compo;
};

const findAllIdsRecursively = (jsonTree: INode): number[] => {
  const ids = [jsonTree.id];

  if (jsonTree.children) {
    for (let i = 0; i < jsonTree.children.length; i++) {
      const child = jsonTree.children[i];
      ids.push(...findAllIdsRecursively(child));
    }
  }

  return ids;
};

export const generateTreeId = () => {
  // If not specified, generate automatically a unique id
  const sharedStates = useSharedStates();
  let generatedId = null as null | string;
  let count = 0;
  while (!generatedId && count < 10) {
    // Create a string unique id
    generatedId = `__${sharedStates.methods.keys().length + count}`;
    if (sharedStates.methods.hasKey(generatedId)) {
      generatedId = null;
    }

    ++count;
  }
  if (!generatedId) {
    throw new Error('Could not generate a unique id for the tree node');
  }

  return generatedId;
};

export const useTree = (id: string) => {
  const sharedStates = useSharedStates();

  let sharedState: ISharedState;
  if (!sharedStates.methods.hasKey(id)) {
    sharedState = sharedStates.methods.create(id);
  } else {
    sharedState = sharedStates.methods.get(id);
  }

  const stateless = {
    treeId: '' + id,
  };

  const methods = {
    filterAvailableComponents: (() => null) as (
      components: string[]
    ) => string[] | null,
    actions,
    findNodeByIdRecursively: _findNodeByIdRecursively(id),
    findAllIdsRecursively,
    clear: (treeId: string) => {
      sharedStates.methods.remove(treeId);
    },
    findComponentByName,
  };

  return {
    sharedState,
    stateless,
    methods,
  };
};
