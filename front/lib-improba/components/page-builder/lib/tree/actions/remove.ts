import { useTree } from './../use-tree';

export const remove = (options: { targetId: number; treeId: string }) => {
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
    console.log(targetNodeParent);
    throw new Error(
      `Target node with id ${options.targetId} has no parent with children`
    );
  }

  let count = -1;
  let found = false;
  for (const child of targetNodeParent.children) {
    count++;

    if (child.id === targetNode.id) {
      targetNodeParent.children.splice(count, 1);
      found = true;
      break;
    }
  }

  if (!found) {
    console.log(targetNodeParent);
    throw new Error(`Node (id=${targetNode.id}) was not found in parent`);
  }

  state.pageBuilderJson = jsonTree;
};
