import { upJsonTreeMaxId } from './utils';
import { useTree } from './../use-tree';

const recursivelySetNewIds = (node: any, treeId: string): void => {
  const tree = useTree(treeId);
  const state = tree.sharedState;

  node.id = <number>state.pageBuilderJson._maxId + 1;
  upJsonTreeMaxId(state.pageBuilderJson);

  if (node.children) {
    for (const child of node.children) {
      recursivelySetNewIds(child, treeId);
    }
  }
};

export const paste = (options: {
  targetId: number;
  nodeToBePasted: any;
  treeId: string;
}) => {
  const tree = useTree(options.treeId);
  const state = tree.sharedState;

  const jsonTree = JSON.parse(JSON.stringify(state.pageBuilderJson));

  const result = tree.methods.findNodeByIdRecursively(
    options.targetId,
    jsonTree
  );
  if (!result?.node) {
    throw new Error(`Target node with id ${options.targetId} not found`);
  }

  const nodeToBePastedClone = JSON.parse(
    JSON.stringify(options.nodeToBePasted)
  );

  // Reset all ids of the node to be pasted
  recursivelySetNewIds(nodeToBePastedClone, options.treeId);

  const targetNode = result.node;
  // const targetNodeParent = result.parentNode;

  if (!targetNode.children) {
    targetNode.children = [];
  }

  targetNode.children.push({
    ...nodeToBePastedClone,
    id: <number>jsonTree._maxId + 1,
  });
  upJsonTreeMaxId(jsonTree);

  state.pageBuilderJson = jsonTree;
};
