import { watch } from 'vue'
import { ESyncMessageType, ISyncMessageContent } from '../interfaces/iframe.interface';
import { IDragSharedState } from '../interfaces/drag.interface';

export const useDragndrop = (options: {
  sharedIFrameState: any
  sharedDragState: IDragSharedState,
  postMessage: (type: ESyncMessageType, content?: ISyncMessageContent) => void;
}) => {
  const methods = {
    /**
     * _ Set the shared dragElement to the freshly created div based on received string
     * @param dragElement - HTMLElement.outerHTML
     */
    handleDragMessage (sharedDragState: IDragSharedState): void {
      // _ If the currently dragging element is the same, return
      if (options.sharedDragState.dragElement?.outerHTML === sharedDragState?.dragElement) {
        return
      }

      // _ Convert back the received string into HTMLElement
      const el = document.createElement('div')
      el.innerHTML = sharedDragState.dragElement
      const received = el.firstElementChild

      // _ Set the compoName to use it in the onDrop() event as it is no longer in the dragElement
      options.sharedDragState.dragElement = <HTMLElement>received
      options.sharedDragState.compoName = sharedDragState.compoName
    }
  }

  watch(
    () => options.sharedDragState,
    () => {
      options.postMessage(
        ESyncMessageType.drag,
        <IDragSharedState>{
          // ! dragElement must be converted to outerHTML (string) and rebuild on reception
          dragElement: options.sharedDragState.dragElement?.outerHTML,
          compoName: options.sharedDragState.compoName
        }
      )
    },
    { deep: true }
  )

  return {
    methods
  }
}