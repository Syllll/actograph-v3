import { watch } from 'vue';
import {
  ESyncMessageType,
  ISyncMessage,
  ISyncMessageContent,
  ISyncParsedMessage,
} from '../interfaces/iframe.interface';

export const useCommunication = (options: {
  myTreeId: string;
  iframe: boolean;
  sharedIFrameState: any;
  handleMessage: (event: MessageEvent) => void;
}) => {
  const methods = {
    /**
     * _ Get the window where we are (iframe or parent)
     * @note where the events will be emitted
     */
    getCurrentWindow(): Window | null {
      return options.iframe
        ? (
            window.parent.document.getElementById(
              'iframe_' + options.myTreeId
            ) as HTMLIFrameElement
          )?.contentWindow
        : window.parent;
    },
    /**
     * _ Get the window where we want to send the events
     */
    getTargetWindow(): Window | null {
      return !options.iframe
        ? (
            window.parent.document.getElementById(
              'iframe_' + options.myTreeId
            ) as HTMLIFrameElement
          )?.contentWindow
        : window.parent;
    },

    /**
     * _ Posts a message to the opposite composable (iframe/parent)
     */
    postMessage(type: ESyncMessageType, content?: ISyncMessageContent): void {
      const target = methods.getTargetWindow();

      const message = {
        type,
      } as ISyncParsedMessage;

      if (content) {
        message.content = JSON.stringify(content);
      }

      target?.postMessage({ message }, '*');
    },

    /**
     * _ Add the `message` event listener to the current window
     */
    init() {
      const currentWindow = methods.getCurrentWindow();
      currentWindow?.addEventListener('message', options.handleMessage);

      console.log({
        listening: 'message',
        [options.sharedIFrameState.currentType]: true,
      });
    },

    /**
     * _ Remove the `message` event listener from the current window
     */
    down() {
      const currentWindow = methods.getCurrentWindow();
      currentWindow?.removeEventListener('message', options.handleMessage);

      console.log({
        stopListening: 'message',
        [options.sharedIFrameState.currentType]: true,
      });
    },
  };

  watch(
    () => options.myTreeId,
    () => {
      methods.down();

      if (options.myTreeId) {
        methods.init();
      }
    }
  );

  return {
    methods,
  };
};
