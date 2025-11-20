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
  'show-save-dialog',
  'write-file',
  'show-open-dialog',
  'read-file',
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
  showSaveDialog: (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('show-save-dialog', options) as Promise<{
      canceled: boolean;
      filePath?: string;
    }>;
  },
  writeFile: (filePath: string, data: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return ipcRenderer.invoke('write-file', filePath, data) as Promise<{
      success: boolean;
      error?: string;
    }>;
  },
  showOpenDialog: (options: {
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePaths?: string[] }> => {
    return ipcRenderer.invoke('show-open-dialog', options) as Promise<{
      canceled: boolean;
      filePaths?: string[];
    }>;
  },
  readFile: (filePath: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> => {
    return ipcRenderer.invoke('read-file', filePath) as Promise<{
      success: boolean;
      data?: string;
      error?: string;
    }>;
  },
});
