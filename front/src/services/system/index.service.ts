// Ce service est uniquement utilisé en mode Electron où window.api est toujours défini
// L'assertion non-null (!) indique à TypeScript que window.api existe dans ce contexte
const electronApi = window.api!;

export default {
  exit: () => electronApi.invoke('exit'),
  maximize: () => electronApi.invoke('maximize'),
  minimize: () => electronApi.invoke('minimize'),
  readyToCheckUpdates: () => electronApi.invoke('ready-to-check-updates'),
  onUpdateAvailable: (callback: () => void) => {
    electronApi.on('update-available', callback);
  },
  downloadUpdate: () => electronApi.invoke('download-update'),
  installUpdate: () => electronApi.invoke('install-update'),
  onUpdateDownloadProgress: (
    callback: (data: {
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }) => void
  ) => {
    electronApi.on('update-download-progress', callback);
  },

  onUpdateDownloaded: (callback: () => void) => {
    electronApi.on('update-downloaded', callback);
  },

  onUpdateError: (callback: (error: Error) => void) => {
    electronApi.on('update-error', callback);
  },

  quitAndInstallUpdate: () => electronApi.invoke('install-update'),
};
