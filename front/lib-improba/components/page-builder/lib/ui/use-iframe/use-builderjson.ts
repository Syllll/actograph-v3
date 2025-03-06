import { onMounted, onUnmounted, reactive, watch } from 'vue';
import { ESources, ESyncMessageType, IContentUpdatePageBuilderJson, ISyncMessageContent } from '../interfaces/iframe.interface';
import { IDragSharedState } from '../interfaces/drag.interface';

export const useBuilderjson = (options: {
  tree: any;
  sharedDragState: any;
  sharedTreeState: any;
  sharedIFrameState: any;
  postMessage: (type: ESyncMessageType, content?: ISyncMessageContent) => void;
}) => {

  const methods = {
    postUpdateMessage: () => {
      options.postMessage(ESyncMessageType.updatePageBuilderJson,
        <IContentUpdatePageBuilderJson>{ pageBuilderJson: options.tree.sharedState.pageBuilderJson },
      )
    },
    handleMessage(content: any) {
      const _content = <IContentUpdatePageBuilderJson>content;

      const builderJsonReceived = _content.pageBuilderJson;

        // Do nothing if the content is the same
        if (!builderJsonReceived || JSON.stringify(builderJsonReceived) === JSON.stringify(options.tree.sharedState)) {
          return;
        }

        // Update the shared state with the received content
        options.tree.sharedState.pageBuilderJson = builderJsonReceived;
    },
    handleDrop (droppedComponent: any) {
      if (!droppedComponent.component) { return }

      options.tree.methods.actions.add(droppedComponent)
    }
  };

  watch(
    () => options.sharedDragState.droppedComponent,
    () => {
      options.postMessage(
        ESyncMessageType.drop,
        <Partial<IDragSharedState>>{
          droppedComponent: options.sharedDragState.droppedComponent
        }
      )
    },
    { deep: true }
  )

  return {
    methods
  }
}
