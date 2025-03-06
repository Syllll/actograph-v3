import { onMounted, onUnmounted, reactive } from 'vue';

// _ TYPES
import {
  ESources,
  ESyncMessageType,
  EUpdateType,
} from './../interfaces/iframe.interface';
import { INode } from '../../tree/types';

// _ COMPOSABLES
import { useDragCard } from '../local-components/list-check-or-drag/use-drag-card';
import { useKeyboardShortcuts } from './../use-keyboard-shortcuts';
import { useDrawers } from './../use-drawers';
import { useTree } from '../../tree';
import { usePingpong } from './use-pingpong';
import { useBuilderjson } from './use-builderjson';
import { useSelection } from './use-selection';
import { useCommunication } from './use-communication';
import { useDragndrop } from './use-dragndrop';


/**
 * USE-IFRAME
 * _ This composable regroups everything that is needed to communicate between parent and iframe
 *
 * ? Why ?
 * The <iframe> (@lib-improba/pages/cms/iframe/index.vue) displays a render of the pageBuilder content
 * It allows 'us' to control the size of the frame and use native breakpoints in the render instead of having to go back and forth in the preview mode
 *
 * ? How ?
 * Communication is inited by a ping pong protocol that set both instances in ready once they are (by sending a ping and responding a pong)
 * Once they are ready, the pageBuilderJson is synced and the page-building can start
 *
 * On page destroy, both instance needs to be reseted (onUnmounted) to be able to restart the init process once the page is loaded again
 */

/**
 * This sharedState exists in the parent browser AND in the iframe.
 * It is NOT shared between the parent the iframe.
 */
const sharedState = reactive({
  iframe: false,
  currentType: '' as ESources,

  ready: false,

  lastUpdateType: {
    treeState: null as EUpdateType | null,
    selected: null as EUpdateType | null,

    shortcuts: null as EUpdateType | null,
    drawers: null as EUpdateType | null,
  },

  pageUrl: null as string | null,
  treeState: null as any,

  forceSync: null as any,
});
export const getCurrentType = () => sharedState.currentType

export const useIFrame = (myTreeId: string, params?: { iframe: boolean }) => {
  // Get the uses with the shared states we need to synchronize between contexts
  // - useTree: to get the tree shared state
  // - useKeyboardShortcuts: to get the shortcuts shared state
  // - useDrawers: to get the drawers shared state

  //_ Get the shared treeState
  const tree = useTree(myTreeId);
  const sharedTreeState = tree.sharedState;

  //_ Init the keyboardShortcuts and listen to keypressed
  const shortcuts = useKeyboardShortcuts(myTreeId, {
    listen: true,
    iframe: params?.iframe,
  });

  const drawers = useDrawers(myTreeId);
  const dragCard = useDragCard()

  // *************************************
  // #region STATE
  // Define the state of the current component
  // *************************************
  const state = reactive({
    // ? Parent props
    modelValue: null as INode | null,

    pageUrl: null as string | null,
    blocId: null as number | null,

    // builderVars: undefined // Unknow refers to Object
    builderVars: {},
    // builderStyle: undefined // Unknow refers to Object
    builderStyle: {},
  });
  // #endregion

  // *************************************
  // #region METHODS
  // Define the methods of the current component
  // *************************************
  const handleMessage = (event: MessageEvent) => {
    if (!event.data?.message) {
      return;
    }

    const { message } = event.data;

    /**
     * _ If message has content, parse it by default
     * @note communication.postMesssage() automaticaly stringify the message
     */
    const parsedContent = !!message.content && JSON.parse(message.content);

    switch (message.type) {
      // _ PING
      case ESyncMessageType.ping:
        pingpong.methods.handlePingMessage()
        break

      // _ PONG
      case ESyncMessageType.pong:
        pingpong.methods.handlePongMessage()
        break

      // _ PAGE BUILDER
      case ESyncMessageType.updatePageBuilderJson:
        builderJson.methods.handleMessage(parsedContent)
        break

      // _ SELECTION
      case ESyncMessageType.updateSelection:
        selection.methods.handleSelectionChange(parsedContent.selectedId)
        break

      // _ DRAG
      case ESyncMessageType.drag:
        drag.methods.handleDragMessage(parsedContent)
        break

      // _ DROP
      case ESyncMessageType.drop:
        builderJson.methods.handleDrop(parsedContent.droppedComponent)
        break
    }
  }
  // #endregion

  // *************************************
  // #region USES
  // Features uses
  // *************************************

  /**
   * Includes communication methods
   */
  const communication = useCommunication({
    myTreeId,
    iframe: !!params?.iframe,
    sharedIFrameState: sharedState,
    handleMessage: handleMessage
  })

  /**
   * Sync pageBuilderJson
   */
  const builderJson = useBuilderjson({
    tree,
    postMessage: communication.methods.postMessage,
    sharedIFrameState: sharedState,
    sharedTreeState: tree.sharedState,
    sharedDragState: dragCard.sharedState
  });

  /**
   * Communication protocol between the parent and the iframe.
   * Ensure they are both ready to communicate
   */
  const pingpong = usePingpong({
    tree,
    sharedIFrameState: sharedState,
    iframeState: state,
    postMessage: communication.methods.postMessage,
    builderJson,
  });

  /**
   * Handle selection updates
   * TODO Handle outline + readonly
   */
  const selection = useSelection({
    tree,
    sharedTreeState: tree.sharedState,
    sharedIFrameState: sharedState,
    postMessage: communication.methods.postMessage
  });

  /**
   * Handle dragElement updates
   */
  const drag = useDragndrop({
    postMessage: communication.methods.postMessage,
    sharedIFrameState: sharedState,
    sharedDragState: dragCard.sharedState
  })

  // List and return the uses
  const uses = {
    communication,
    pingpong,
    builderJson,
    selection,
    drag,
  };
  // #endregion

  // *************************************
  // #region METHODS
  // Methods
  // *************************************
  const methods = {
    init () {
      // _ Globally defines on which instance 'we' are
      sharedState.iframe = !!params?.iframe;
      sharedState.currentType = sharedState.iframe
        ? ESources.iframe
        : ESources.parent;

      // _ Init communications
      communication.methods.init()

      // _ Start the ping pong between both instances (parent/iframe)
      pingpong.methods.init();
    },

    reset () {
      // _ Down communications
      communication.methods.down()

      // _ Reset readyness
      pingpong.methods.down()
    }
  };
  // #endregion

  onMounted(() => {
    methods.init();
  });

  onUnmounted(() => {
    methods.reset();
  });

  return {
    sharedState,
    treeState: sharedTreeState,
    state,
    methods,
    uses,
  };
};
