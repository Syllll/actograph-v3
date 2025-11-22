import { boot } from 'quasar/wrappers';
import { boot as bootGlobalComponent } from 'src/../lib-improba/boot/global-components';
import { boot as bootI18n } from 'src/../lib-improba/boot/i18n';
import { boot as bootAxios } from 'src/../lib-improba/boot/axios';
import { useImprobaInit } from 'src/../lib-improba/composables/use-improba-init';

declare global {
  interface Window {
    api: {
      send: (channel: string, data: any) => void;
      invoke: (channel: string, data?: unknown) => Promise<unknown>;
      on: (channel: string, func: any) => void;
      openExternal: (url: string) => void;
      showSaveDialog: (options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePath?: string }>;
      writeFile: (
        filePath: string,
        data: string
      ) => Promise<{ success: boolean; error?: string }>;
      showOpenDialog: (options: {
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePaths?: string[] }>;
      readFile: (filePath: string) => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;
      readFileBinary: (filePath: string) => Promise<{
        success: boolean;
        data?: string; // base64 encoded
        error?: string;
      }>;
    };
  }
}

export default boot(async ({ app, router }) => {
  bootI18n({ app });
  bootAxios({ app });
  bootGlobalComponent({ app });

  const quasar = app.config.globalProperties.$q;

  // Init improba composables that need to be initialized at the start of the app
  await useImprobaInit(quasar, router);
});
