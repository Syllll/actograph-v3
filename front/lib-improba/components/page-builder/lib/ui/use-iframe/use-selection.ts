import { watch } from 'vue';
import { ESyncMessageType, EUpdateType, IContentUpdateSelection, ISyncMessageContent } from '../interfaces/iframe.interface';

export const useSelection = (options: {
  tree: any
  sharedTreeState: any;
  sharedIFrameState: any;
  postMessage: (type: ESyncMessageType, content?: ISyncMessageContent) => void;

}) => {
  const methods = {
    /**
     * _ Sync the selected node between both treeState instances (parent/iframe).
     * @param receivedNodeId number
     * @note Find recursively the node based on the id and compare it with the currently selected
     */
    handleSelectionChange (receivedNodeId: IContentUpdateSelection): void {
      //_ In a given context (iframe, parent), we have a node that is selected and we want to sync it with the other context

      // * The selectedNode is our context yet (we want to update id)
      const currentSelectedNodeId = options.sharedTreeState.selected?.id;

      // * We received the id of the node we want to select, this is coming from the other context.
      // * Setup a guard to avoid infinite loop when the selection change
      // * We don't want to update the selection if it is already the same
      if (currentSelectedNodeId === receivedNodeId) {
        return;
      }

      // We want to look for the node in the tree that has the id we received
      const toSelectInOurContext = options.tree.methods.findNodeByIdRecursively(
        receivedNodeId
      );
      // If we found the node, we can update the selection
      // If not, toSelectInOut context will be null and selection reseted
      options.sharedTreeState.selected = toSelectInOurContext?.node;
    }
  }


  watch(
    () => options.sharedTreeState.selected,
    () => {
      options.postMessage(
        ESyncMessageType.updateSelection,
        <IContentUpdateSelection>{
          selectedId: options.sharedTreeState.selected?.id
        },
      );
    }
  );

  return {
    methods
  }
}