const electronApi = window.api;

export default {
  exit: () => electronApi.invoke('exit'),
  maximize: () => electronApi.invoke('maximize'),
  minimize: () => electronApi.invoke('minimize'),

  onUpdateAvailable: (callback: () => void) => {
    electronApi.on('update-available', callback);
  },
  onUpdateDownloadProgress: (callback: (data: { percent: number, transferred: number, total: number, bytesPerSecond: number }) => void) => {
    electronApi.on('update-download-progress', callback);
  },

  onUpdateDownloaded: (callback: () => void) => {
    electronApi.on('update-downloaded', callback);
  },

  onUpdateError: (callback: (error: Error) => void) => {
    electronApi.on('update-error', callback);
  },

  restart: () => electronApi.invoke('restart'),
  
};
