import { contextBridge, ipcRenderer } from 'electron';

const validChannels = [
  'exit',
  'maximize',
  'minimize',
  'ready-to-check-updates',
  'update-available',
  'download-update',
  'install-update',
  'update-download-progress',
  'update-downloaded',
  'update-error',
  'open-external',
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  send: (channel: string, data: any) => {
    // whitelist channels
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },
  invoke: (channel: string, data: unknown): Promise<unknown> => {
    // whitelist channels
    // console.log('validInvokeChannels', validInvokeChannels());
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    } else {
      throw new Error(`Invalid invoke channel: ${channel}`);
    }
  },
  on: (channel: string, func: any) => {
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url);
  },
});
