import { useTree } from './../use-tree';

export const reorder = (options: {
  targetId: number;
  slot: string;
  order: number;
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

  const targetNode = result.node;
  const targetNodeParent = result.parentNode;

  if (!targetNodeParent?.children?.length) {
    throw new Error(
      `Target node with id ${options.targetId} has no parent with children`
    );
  }
  const order = options.order;
  if (order === undefined || order === null) {
    throw new Error('Order is not defined');
  }

  const slot = options.slot;
  if (slot === undefined || slot === null) {
    throw new Error('Slot is not defined');
  }

  // *****************
  // Remove the node to be place elsewhere
  // *****************

  let intendedIndexOfTargetNode: null | number = null;
  let count = -1;
  for (const child of targetNodeParent.children) {
    count++;

    if (child.slot !== slot) {
      continue;
    }

    if (child.id === targetNode.id) {
      targetNodeParent.children.splice(count, 1);
      intendedIndexOfTargetNode = count;
      break;
    }
  }

  if (intendedIndexOfTargetNode === null) {
    throw new Error('Target node not found in parent children');
  }

  // Compute the intended index
  intendedIndexOfTargetNode += options.order;
  if (intendedIndexOfTargetNode < 0) {
    intendedIndexOfTargetNode = 0;
  }

  // *****************
  // Re-insert the previously removed node
  // *****************

  let childAdded = false;
  count = -1;

  for (const child of targetNodeParent.children) {
    count++;

    if (child.slot !== slot) {
      continue;
    }

    if (count === intendedIndexOfTargetNode) {
      targetNodeParent.children.splice(count, 0, targetNode);
      childAdded = true;
      break;
    }
  }

  if (!childAdded) {
    targetNodeParent.children.push(targetNode);
  }

  state.pageBuilderJson = jsonTree;
};
