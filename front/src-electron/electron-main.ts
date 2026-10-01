import {
  app,
  BrowserWindow,
  nativeTheme,
  screen,
  ipcMain,
  dialog,
  shell,
  powerMonitor,
} from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import http from 'http';
import { fork } from 'child_process';
import { randomBytes } from 'crypto';
import { BackendSupervisor } from './backend-supervisor';
import {
  isTrustedAppUrl,
  isSafeExternalUrl,
  isTrustedCloudUrl,
} from './trusted-url';
import { getPort } from 'get-port-please';
import { autoUpdater } from 'electron-updater';
const log = require('electron-log');

autoUpdater.logger = log;
log.transports.file.level = 'info';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(
      path.join(app.getPath('userData'), 'DevTools Extensions')
    );
  }
} catch (_) {}

let mainWindow: BrowserWindow | undefined;
let backend: BackendSupervisor | undefined;
const backendToken = randomBytes(32).toString('hex');
let serverPort: number | undefined;
let isAutoUpdaterConfigured = false;
let updateReadyToInstall = false;
let isAppQuitting = false;
let quitAllowed = false;
let quitInProgress = false;
let recreatingMainWindow = false;
let lastServerStatus: {
  status: string;
  message: string;
  progress?: number;
  serverPort?: number;
} | null = null;
const BACKEND_HEALTH_TIMEOUT_MS = 3_000;
const publicFolder = path.resolve(
  __dirname,
  <string>process.env.QUASAR_PUBLIC_FOLDER
);

function setupAutoUpdaterEventListeners() {
  if (isAutoUpdaterConfigured) {
    return;
  }

  // Configure autoUpdater BEFORE setting up event listeners
  // Disable auto-download - user must approve first
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Auto-Update Event Listeners
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);

    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send update info to renderer process
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Add download progress event
  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent.toFixed(2)}%`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      const roundedPercent = Number(progressObj.percent.toFixed(2));
      // Send progress to renderer process
      mainWindow.webContents.send('update-download-progress', {
        percent: roundedPercent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyToInstall = true;
    log.info('Update downloaded');

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    log.error('Update error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
    }
  });

  // Add check-for-updates event listener
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info.version);
  });

  isAutoUpdaterConfigured = true;
}

async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width,
    height,
    minWidth: 700,
    minHeight: 400,
    autoHideMenuBar: true,
    useContentSize: false,
    titleBarStyle: 'hidden',
    show: false,
    x: 0,
    y: 0,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        __dirname,
        process.env.QUASAR_ELECTRON_PRELOAD || ''
      ),
      // Dev is served over HTTP and still needs file: video access. Packaged
      // renderers use file: and keep Chromium's security checks enabled.
      webSecurity: Boolean(process.env.PROD),
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppUrl(url, String(process.env.APP_URL)))
      event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppUrl(url, String(process.env.APP_URL))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            preload: path.resolve(
              __dirname,
              process.env.QUASAR_ELECTRON_PRELOAD || ''
            ),
            webSecurity: Boolean(process.env.PROD),
            backgroundThrottling: false,
          },
        },
      };
    }
    if (isSafeExternalUrl(url))
      void shell.openExternal(url).catch((error) => log.error(error));
    return { action: 'deny' };
  });
  mainWindow.webContents.on('did-create-window', (window) => {
    window.webContents.on('will-navigate', (event, url) => {
      if (!isTrustedAppUrl(url, String(process.env.APP_URL)))
        event.preventDefault();
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    log.error('Renderer failed to load', code, description);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('Renderer process exited', details);
  });

  // Load the URL with query parameters
  const loadPromise = mainWindow.loadURL(
    <string>process.env.APP_URL +
      '?serverPort=' +
      serverPort +
      '&targetRoute=/gateway'
  );

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });

    //mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  // Wait for the window to be loaded before checking for updates
  await loadPromise;

  setupAutoUpdaterEventListeners();
}

function createBackend(port: number): BackendSupervisor {
  return new BackendSupervisor({
    port,
    spawn: () => {
      const child = fork(
        path.join(
          process.resourcesPath,
          'src-electron/extra-resources/api/api.bundle.js'
        ),
        [
          '--subprocess',
          String(port),
          path.join(
            process.resourcesPath,
            'src-electron/extra-resources/api/.env'
          ),
          app.getPath('userData'),
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          env: {
            ...process.env,
            PROD: 'true',
            ELECTRON_RUN_AS_NODE: '1',
            ACTOGRAPH_DESKTOP_TOKEN: backendToken,
          },
        }
      );
      child.stdout?.on('data', (data: Buffer) =>
        log.info(`[Server Process] ${data.toString().trim()}`)
      );
      child.stderr?.on('data', (data: Buffer) =>
        log.error(`[Server Process Error] ${data.toString().trim()}`)
      );
      log.info('Backend process created', { pid: child.pid, port });
      return child;
    },
    health: checkBackendHealth,
    notify: notifyBackendStatus,
    log: (message, error) => log.error(message, error ?? ''),
  });
}

function broadcastAppEvent(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (
      !window.isDestroyed() &&
      isTrustedAppUrl(window.webContents.getURL(), String(process.env.APP_URL))
    ) {
      try {
        window.webContents.send(channel, payload);
      } catch (error) {
        log.error('Unable to notify renderer', channel, error);
      }
    }
  }
}

function notifyBackendStatus(
  status: string,
  message: string,
  extra?: { progress?: number }
) {
  lastServerStatus = {
    status,
    message,
    serverPort,
    ...extra,
  };
  broadcastAppEvent('server-status', lastServerStatus);
}

function checkBackendHealth(): Promise<boolean> {
  if (!serverPort) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const deadline = setTimeout(() => {
      req.destroy();
      resolve(false);
    }, BACKEND_HEALTH_TIMEOUT_MS);
    const finish = (healthy: boolean) => {
      clearTimeout(deadline);
      resolve(healthy);
    };
    const req = http.get(
      `http://127.0.0.1:${serverPort}/security/say-hi`,
      {
        timeout: BACKEND_HEALTH_TIMEOUT_MS,
        headers: { 'X-Actograph-Token': backendToken },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          finish(res.statusCode === 200 && body === 'hi');
        });
        res.on('error', () => finish(false));
        res.on('aborted', () => finish(false));
      }
    );

    req.on('error', () => finish(false));
    req.on('timeout', () => {
      req.destroy();
      finish(false);
    });
  });
}

async function ensureBackendRunning(): Promise<boolean> {
  if (isAppQuitting) return false;
  if (!process.env.PROD) return true;
  return backend ? backend.ensureRunning() : false;
}

function setupPowerMonitor() {
  powerMonitor.on('resume', () => {
    log.info('System resumed from sleep');
    broadcastAppEvent('app-resume', {});
    void ensureBackendRunning();
  });
}

function ensureActographFolder() {
  try {
    const documentsPath = app.getPath('documents');
    const actographFolder = path.join(documentsPath, 'Actograph');

    if (!fs.existsSync(actographFolder)) {
      fs.mkdirSync(actographFolder, { recursive: true });
      log.info('Created Actograph folder on startup:', actographFolder);
    }
  } catch (error) {
    log.error('Error ensuring Actograph folder on startup:', error);
  }
}

const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
  isAppQuitting = true;
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
    if (!mainWindow) app.emit('activate');
  });
  void app
    .whenReady()
    .then(async () => {
      ensureActographFolder();
      log.info('Application log:', log.transports.file.getFile().path);
      if (process.env.PROD) {
        serverPort = await getPort({ host: '127.0.0.1' });
        if (isAppQuitting) return;
        backend = createBackend(serverPort);
      }
      await createWindow();
      if (process.env.PROD) {
        await ensureBackendRunning();
        setupPowerMonitor();
      }
    })
    .catch((error) => {
      log.error('Application startup failed', error);
      notifyBackendStatus('error', 'Impossible de démarrer l’application.');
    });
}

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (
    isAppQuitting ||
    !app.isReady() ||
    (process.env.PROD && !backend) ||
    mainWindow !== undefined ||
    recreatingMainWindow
  ) {
    return;
  }
  recreatingMainWindow = true;
  void (async () => {
    try {
      let backendOk = true;
      if (process.env.PROD) {
        backendOk = await ensureBackendRunning();
      }
      if (isAppQuitting) return;
      if (mainWindow === undefined) {
        await createWindow();
      }
      if (process.env.PROD) {
        if (backendOk) {
          notifyBackendStatus('ready', 'Application prête !');
        } else {
          notifyBackendStatus(
            'error',
            'Impossible de démarrer le serveur local.'
          );
        }
      }
    } catch (error) {
      log.error('Window recreation failed', error);
      notifyBackendStatus('error', 'Impossible de démarrer l’application.');
    } finally {
      recreatingMainWindow = false;
    }
  })();
});

async function stopBackend(): Promise<void> {
  isAppQuitting = true;
  await backend?.shutdown();
}

app.on('before-quit', (event) => {
  isAppQuitting = true;
  if (quitAllowed || !backend) return;
  event.preventDefault();
  if (quitInProgress) return;
  quitInProgress = true;
  void stopBackend()
    .catch((error) => {
      log.error('Backend shutdown failed', error);
      backend?.killImmediately();
    })
    .finally(() => {
      quitAllowed = true;
      app.quit();
    });
});
process.on('exit', () => backend?.killImmediately());
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  app.quit();
});

// ************
// IPC
// ************

function validateIpcSender(
  event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent
): void {
  if (
    !event.senderFrame ||
    !isTrustedAppUrl(event.senderFrame.url, String(process.env.APP_URL))
  ) {
    throw new Error('Untrusted IPC sender');
  }
}
const handleIpc: typeof ipcMain.handle = (channel, listener) => {
  ipcMain.handle(channel, (event, ...args) => {
    validateIpcSender(event);
    return listener(event, ...args);
  });
};
const onIpc = (
  channel: string,
  listener: (event: Electron.IpcMainEvent, ...args: any[]) => void
) => {
  ipcMain.on(channel, (event, ...args) => {
    try {
      validateIpcSender(event);
      listener(event, ...args);
    } catch (error) {
      log.error('Rejected IPC message', channel, error);
    }
  });
};

handleIpc('ensure-backend', async () => {
  const ok = await ensureBackendRunning();
  return { ok };
});

handleIpc(
  'cloud-request',
  async (
    _event,
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: ArrayBuffer;
    }
  ) => {
    if (
      !request ||
      !isTrustedCloudUrl(request.url) ||
      !['GET', 'POST', 'DELETE', 'HEAD'].includes(request.method)
    ) {
      throw new Error('Invalid cloud request');
    }
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(request.headers || {})) {
      if (
        ['accept', 'content-type', 'x-auth-token'].includes(
          name.toLowerCase()
        ) &&
        typeof value === 'string'
      )
        headers[name] = value;
    }
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.body ? Buffer.from(request.body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    return {
      status: response.status,
      headers: Array.from(response.headers.entries()),
      body: await response.arrayBuffer(),
    };
  }
);

handleIpc('get-backend-connection', () => ({
  port: serverPort,
  token: backendToken,
}));

handleIpc('open-logs', () =>
  shell.showItemInFolder(log.transports.file.getFile().path)
);

handleIpc('get-server-status', async () => {
  return lastServerStatus;
});

handleIpc('exit', (event, arg) => {
  app.quit();
});

handleIpc('maximize', (event, arg) => {
  mainWindow?.maximize();
});

handleIpc('minimize', (event, arg) => {
  mainWindow?.minimize();
});

handleIpc('ready-to-check-updates', async (event, arg) => {
  // This just checks for updates but doesn't download automatically
  try {
    log.info('Checking for updates...');
    const result = await autoUpdater.checkForUpdates();
    log.info('Update check result:', {
      updateInfo: result?.updateInfo,
      downloadPromise: result?.downloadPromise ? 'exists' : 'none',
    });
    return result;
  } catch (error) {
    log.error('Error checking for updates:', error);
    throw error;
  }
});

// Add these new IPC handlers
handleIpc('download-update', async (event, arg) => {
  // Manually trigger the download when user approves
  try {
    log.info('Starting update download...');
    const result = await autoUpdater.downloadUpdate();
    log.info('Update download started:', result);
    return result;
  } catch (error) {
    log.error('Error downloading update:', error);
    throw error;
  }
});

handleIpc('install-update', async (event, arg) => {
  // Manually trigger the installation
  try {
    if (!updateReadyToInstall)
      throw new Error('No downloaded update available');
    log.info('Installing update and quitting...');
    // quitAndInstall(isSilent, isForceRunAfter)
    // isSilent: if true, run installer in silent mode (Windows/NSIS only; ignored on macOS/Linux)
    // isForceRunAfter: if true, relaunch the app once the (silent) install is done
    await stopBackend();
    quitAllowed = true;
    autoUpdater.quitAndInstall(true, true);
  } catch (error) {
    log.error('Error installing update:', error);
    if (isAppQuitting) app.quit();
    throw error;
  }
});

onIpc('open-external', (event, url: string) => {
  // Open external links in the user's default browser
  if (isSafeExternalUrl(url))
    void shell.openExternal(url).catch((error) => log.error(error));
});

handleIpc('show-item-in-folder', async (event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    log.error('Error showing item in folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

handleIpc('get-actograph-folder', async (event) => {
  // Get the Documents directory path
  const documentsPath = app.getPath('documents');
  const actographFolder = path.join(documentsPath, 'Actograph');

  // Create the folder if it doesn't exist
  if (!fs.existsSync(actographFolder)) {
    try {
      fs.mkdirSync(actographFolder, { recursive: true });
      log.info('Created Actograph folder:', actographFolder);
    } catch (error) {
      log.error('Error creating Actograph folder:', error);
      throw error;
    }
  }

  return actographFolder;
});

handleIpc('get-autosave-folder', async (event) => {
  // Get the userData directory path (Electron app data folder)
  const userDataPath = app.getPath('userData');
  const autosaveFolder = path.join(userDataPath, 'autosave');

  // Create the folder if it doesn't exist
  if (!fs.existsSync(autosaveFolder)) {
    try {
      fs.mkdirSync(autosaveFolder, { recursive: true });
      log.info('Created autosave folder:', autosaveFolder);
    } catch (error) {
      log.error('Error creating autosave folder:', error);
      throw error;
    }
  }

  return autosaveFolder;
});

handleIpc('list-autosave-files', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const autosaveFolder = path.join(userDataPath, 'autosave');

    if (!fs.existsSync(autosaveFolder)) {
      return { success: true, files: [] };
    }

    const files = fs
      .readdirSync(autosaveFolder)
      .filter((file) => file.endsWith('.jchronic'))
      .map((file) => {
        const filePath = path.join(autosaveFolder, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
      ); // Most recent first

    return { success: true, files };
  } catch (error) {
    log.error('Error listing autosave files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      files: [],
    };
  }
});

handleIpc('delete-autosave-file', async (event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log.info('Deleted autosave file:', filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    log.error('Error deleting autosave file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

handleIpc('cleanup-old-autosave', async (event, maxAgeDays: number = 7) => {
  try {
    const userDataPath = app.getPath('userData');
    const autosaveFolder = path.join(userDataPath, 'autosave');

    if (!fs.existsSync(autosaveFolder)) {
      return { success: true, deleted: 0 };
    }

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    const files = fs.readdirSync(autosaveFolder);
    for (const file of files) {
      if (file.endsWith('.jchronic')) {
        const filePath = path.join(autosaveFolder, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          log.info('Deleted old autosave file:', filePath);
        }
      }
    }

    return { success: true, deleted: deletedCount };
  } catch (error) {
    log.error('Error cleaning up old autosave files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      deleted: 0,
    };
  }
});

handleIpc(
  'log-renderer-error',
  async (
    _event,
    payload:
      | {
          report?: string;
          message?: string;
          stack?: string;
          type?: string;
        }
      | null
      | undefined
  ) => {
    if (!payload || typeof payload !== 'object') {
      log.error('[renderer-error] Invalid or missing payload');
      return;
    }

    const {
      report = '',
      message = '(no message)',
      stack = '',
      type = 'unknown',
    } = payload;
    log.error('[renderer-error]', type, message);
    if (stack) {
      log.error(stack);
    }
    if (report) {
      log.error(`Report:\n${report}`);
    }
  }
);

handleIpc(
  'show-save-dialog',
  async (
    event,
    options: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }
  ) => {
    if (!mainWindow) {
      return { canceled: true };
    }

    // Get the Actograph folder path (will be created if it doesn't exist)
    let defaultFolder: string;
    try {
      const documentsPath = app.getPath('documents');
      defaultFolder = path.join(documentsPath, 'Actograph');

      // Create the folder if it doesn't exist
      if (!fs.existsSync(defaultFolder)) {
        fs.mkdirSync(defaultFolder, { recursive: true });
        log.info('Created Actograph folder:', defaultFolder);
      }
    } catch (error) {
      // Fallback to Documents if Actograph folder creation fails
      log.warn(
        'Failed to get/create Actograph folder, using Documents:',
        error
      );
      defaultFolder = app.getPath('documents');
    }

    // Use the provided defaultPath or construct one in the Actograph folder
    const defaultPath = options.defaultPath
      ? path.isAbsolute(options.defaultPath)
        ? options.defaultPath
        : path.join(defaultFolder, options.defaultPath)
      : path.join(defaultFolder, 'chronique.jchronic');

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: options.filters || [
        { name: 'Fichiers Chronique', extensions: ['jchronic'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    });

    return result;
  }
);

handleIpc(
  'write-file',
  async (
    event,
    filePath: string,
    data: string,
    options?: { encoding?: 'utf8' | 'base64' }
  ) => {
    try {
      if (options?.encoding === 'base64') {
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      } else {
        fs.writeFileSync(filePath, data, 'utf8');
      }
      return { success: true };
    } catch (error) {
      log.error('Error writing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

handleIpc(
  'show-open-dialog',
  async (
    event,
    options: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }
  ) => {
    if (!mainWindow) {
      return { canceled: true };
    }

    // Utiliser le dossier fourni, sinon Documents/Actograph (dossier chroniques)
    const documentsPath = app.getPath('documents');
    const actographFolder = path.join(documentsPath, 'Actograph');
    const defaultPath = options.defaultPath || actographFolder;

    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath,
      filters: options.filters || [
        { name: 'Fichiers Chronique', extensions: ['jchronic', 'chronic'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    return result;
  }
);

handleIpc('read-file', async (event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    log.error('Error reading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

handleIpc('read-file-binary', async (event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath);
    // Convert Buffer to base64 for transmission
    const base64 = data.toString('base64');
    return { success: true, data: base64 };
  } catch (error) {
    log.error('Error reading binary file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

handleIpc(
  'copy-file',
  async (
    event,
    sourcePath: string,
    targetPath: string,
    options?: { overwrite?: boolean }
  ) => {
    try {
      if (!sourcePath || !targetPath) {
        return { success: false, error: 'Source or target path is missing' };
      }

      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Source file not found' };
      }

      const sourceStats = fs.statSync(sourcePath);
      if (!sourceStats.isFile()) {
        return { success: false, error: 'Source path is not a file' };
      }

      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const overwrite = options?.overwrite === true;
      if (!overwrite && fs.existsSync(targetPath)) {
        return { success: false, error: 'Target file already exists' };
      }

      fs.copyFileSync(sourcePath, targetPath);
      return { success: true, targetPath };
    } catch (error) {
      log.error('Error copying file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

handleIpc('get-file-stats', async (event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      size: stats.size,
      isFile: stats.isFile(),
      exists: true,
    };
  } catch (error) {
    log.error('Error getting file stats:', error);
    return {
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// ************
