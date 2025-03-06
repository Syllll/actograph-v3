import { createChild, upJsonTreeMaxId } from './utils';
import { useTree } from './../use-tree';

export const add = (options: {
  targetId: number;
  component: string;
  slot: string;
  order?: number;
  treeId: string;
}) => {
  // console.log('add', options)
  const tree = useTree(options.treeId);
  const state = tree.sharedState;

  // It is required to clone the json tree here, otherwise the state will be updated unpredictably
  const jsonTree = JSON.parse(JSON.stringify(state.pageBuilderJson));

  const result = tree.methods.findNodeByIdRecursively(
    options.targetId,
    jsonTree
  );
  if (!result?.node) {
    throw new Error(`Target node with id ${options.targetId} not found`);
  }

  const targetNode = result.node;
  // const targetNodeParent = result.parentNode;

  if (!targetNode.children) {
    targetNode.children = [];
  }

  if (options.order !== undefined) {
    const order = options.order;

    let childAdded = false;
    let count = -1;

    for (const child of targetNode.children) {
      count++;

      if (child.slot !== options.slot) {
        continue;
      }

      if (order === count) {
        targetNode.children.splice(
          count,
          0,
          createChild({
            id: <number>jsonTree._maxId + 1,
            name: options.component,
            slot: options.slot,
          })
        );
        childAdded = true;
        break;
      }
    }

    if (!childAdded) {
      targetNode.children.push(
        createChild({
          id: <number>jsonTree._maxId + 1,
          name: options.component,
          slot: options.slot,
        })
      );
    }
  } else {
    targetNode.children.push(
      createChild({
        id: <number>jsonTree._maxId + 1,
        name: options.component,
        slot: options.slot,
      })
    );
  }

  upJsonTreeMaxId(jsonTree);
  state.selected = null;
  state.pageBuilderJson = jsonTree;
};
