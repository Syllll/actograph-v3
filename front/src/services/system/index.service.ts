import type { DesktopUpdateState } from 'src/utils/desktop-update-state';

// Ce service est uniquement utilisé en mode Electron où window.api est toujours défini
// L'assertion non-null (!) indique à TypeScript que window.api existe dans ce contexte
const electronApi = window.api!;

interface UpdateInfoPayload {
  version: string;
  releaseNotes?: unknown;
}

interface UpdateDownloadProgressPayload {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export default {
  exit: () => electronApi.invoke('exit'),
  maximize: () => electronApi.invoke('maximize'),
  minimize: () => electronApi.invoke('minimize'),
  readyToCheckUpdates: () => electronApi.invoke('ready-to-check-updates'),
  onUpdateAvailable: (callback: (payload: UpdateInfoPayload) => void) => {
    electronApi.on('update-available', callback);
  },
  downloadUpdate: () => electronApi.invoke('download-update'),
  onUpdateDownloadProgress: (callback: (data: UpdateDownloadProgressPayload) => void) => {
    return electronApi.on('update-download-progress', callback);
  },

  quitAndInstallUpdate: () => electronApi.invoke('install-update'),
  getUpdateState: () =>
    electronApi.invoke('get-update-state') as Promise<DesktopUpdateState>,
  onUpdateState: (callback: (state: DesktopUpdateState) => void) =>
    electronApi.on('update-state', callback),
  openLogs: () => electronApi.invoke('open-logs'),
};
