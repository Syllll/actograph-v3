import { reactive } from 'vue';
import { ESources, ESyncMessageType, ESyncPingpongType, ISyncMessageContent } from '../interfaces/iframe.interface';
import { notify } from '@lib-improba/utils/notify.utils';

export const usePingpong = (options: {
  tree: any;
  sharedIFrameState: any;
  iframeState: any;
  builderJson: any;
  postMessage: (type: ESyncMessageType, content?: ISyncMessageContent) => void;
}) => {
  const state = reactive({
    //_ Communication settings between both composable instances
    communication: {
      retries: 0,
      maxRetries: 10,
      timeout: 1000,
    },
  });

  const methods = {
    /**
     *_ Sends a ping or pong message to the opposite composable instance
     * @param type Either 'ping' or 'pong'
     */
    postMessage(type: keyof typeof ESyncPingpongType): void {
      options.postMessage(ESyncMessageType[type])
    },

    /**
     * _ Sends back a 'pong' message
    */
    handlePingMessage(): void {
      methods.postMessage('pong');
      // methods.postPongMessage();
    },

    /**
     * _ Sets the composable communication state as ready.
     * @note If this instance is the parent, call `builderJson.postUpdateMessage()`
    */
    handlePongMessage(): void {
      console.log({ [options.sharedIFrameState.currentType]: 'ready' });
      options.sharedIFrameState.ready = true;

      // If we are in the parent and we are ready, we can send the initial state
      if (options.sharedIFrameState.currentType === ESources.parent) {
        options.builderJson.methods.postUpdateMessage();
      }
    },

    /**
     *_ Initialize the communications.
     * Each context will send a ping and wait for a pong
     * @note If no pong is received, call the init() function until maxTries is reached or pong is received
     */
    init: () => {
      if (options.sharedIFrameState.ready) {
        return;
      }

      const { retries, maxRetries, timeout } = state.communication;
      methods.postMessage('ping');
      // methods.postPingMessage();

      // Send a ping and wait for a pong, resend a ping if required
      setTimeout(() => {
        if (options.sharedIFrameState.ready) { return }

        if (retries < maxRetries) {
          console.log({ [options.sharedIFrameState.currentType]: 'timeout' });
          methods.init();

          state.communication.retries++;
        } else {
          notify({
            message: `Error while initiating communication from ${options.sharedIFrameState.currentType}`,
            color: 'negative',
          });
        }
      }, timeout);
    },

    /**
     *_ Sets the communication readyness at false on each context
     */
    down: () => {
      options.sharedIFrameState.ready = false;
    }
  };
  return {
    methods,
  };
};
