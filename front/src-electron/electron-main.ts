import {
  app,
  BrowserWindow,
  nativeTheme,
  screen,
  ipcMain,
  dialog,
  shell,
} from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fork } from 'child_process';
import {
  getPort,
  checkPort,
  getRandomPort,
  waitForPort,
} from 'get-port-please';
import { Worker } from 'worker_threads';
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(
      path.join(app.getPath('userData'), 'DevTools Extensions')
    );
  }
} catch (_) { }

let mainWindow: BrowserWindow | undefined;
let serverProcess: any = null;
let serverWorker: Worker | undefined;
let serverPort: number | undefined;
const publicFolder = path.resolve(
  __dirname,
  <string>process.env.QUASAR_PUBLIC_FOLDER
);

async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width,
    height: height - 1,
    minWidth: 700,
    minHeight: 400,
    autoHideMenuBar: true,
    useContentSize: false,
    titleBarStyle: 'hidden',
    x: 0,
    y: 0,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        __dirname,
        process.env.QUASAR_ELECTRON_PRELOAD || ''
      ),
    },
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

  // Auto-Update Event Listeners
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);

    if (mainWindow) {
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

    if (mainWindow) {
      // Send progress to renderer process
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent.toFixed(2),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');

    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);

    if (mainWindow) {
      mainWindow.webContents.send('update-error', err);
    }
  });
}

/**
 * Creates a background process that runs the server.
 * In electron, the server is run as a subprocess. The server is a nestjs instance using sqlite as database.
 * @param port The port to run the server on
 */
function createBackgroundProcess(port: number) {
  const promise = new Promise((accept, reject) => {
    try {
      const envPath = path.join(
        process.resourcesPath,
        'src-electron/extra-resources/api/.env'
      );
      const serverPath = path.join(
        process.resourcesPath,
        'src-electron/extra-resources/api/dist/src/main.js'
      );

      // Get the path to the database file, the path depends on the platform with must be located in the application data folder
      const dbPath = path.join(
        app.getPath('userData') // This gets the per-user application data directory
      );

      // stdio ensure we can capture all output streams
      serverProcess = fork(
        serverPath,
        ['--subprocess', port.toString(), envPath, dbPath],
        {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          env: {
            PROD: 'true',
            ELECTRON_RUN_AS_NODE: '1',
          },
        }
      );

      // Listeners for both stdout and stderr streams
      // Prefixes to the console output ([Server Process] and [Server Process Error])
      // to distinguish the child process output from the main process output
      serverProcess.stdout?.on('data', (data: Buffer) => {
        const message = `[Server Process] ${data.toString().trim()}`;
        console.log(message);
        log.info(message); // Also write to electron-log

        if (message.includes('*** App server starting... ***')) {
          console.log('App server is starting...');
          log.info('App server is starting...');
          accept({});
        }
      });
      serverProcess.stderr?.on('data', (data: Buffer) => {
        const message = `[Server Process Error] ${data.toString().trim()}`;
        console.error(message);
        log.error(message); // Also write to electron-log
      });

      serverProcess.on('message', (msg: string) => {
        console.log('message:', msg);
        log.info(`[Server IPC] ${msg}`); // Log IPC messages too
      });

      // Add error handler for the fork process
      serverProcess.on('error', (err) => {
        console.error('Failed to start server process:', err);
        log.error('Failed to start server process:', err);
      });

      // Add exit handler to detect if process exits unexpectedly
      serverProcess.on('exit', (code, signal) => {
        if (code !== 0) {
          console.error(`Server process exited with code ${code} and signal ${signal}`);
          log.error(`Server process exited with code ${code} and signal ${signal}`);
        }
      });
    } catch (error) {
      console.error('Error while creating background process', error);
      log.error('Error while creating background process', error);
      reject({msg: 'Error while creating background process', error});
      // throw error;
    }
  });

  return promise;
}

app.whenReady().then(async () => {
  if (process.env.PROD) {
    serverPort = await getPort();

    // We tryc to start the backend several times, in case it does not work (windows...)
    let backendStarted = false;
    let tryCount = 0;
    while (tryCount < 3 && backendStarted === false) {
      tryCount ++;
      try {
        await createBackgroundProcess(serverPort);
        backendStarted = true;
      } catch (err) {
        console.error(err);
        backendStarted = false;
      }
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// Add this to ensure proper cleanup
process.on('exit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

// ************
// IPC
// ************

ipcMain.handle('exit', (event, arg) => {
  app.quit();
});

ipcMain.handle('maximize', (event, arg) => {
  mainWindow?.maximize();
});

ipcMain.handle('minimize', (event, arg) => {
  mainWindow?.minimize();
});

ipcMain.handle('ready-to-check-updates', (event, arg) => {
  // This just checks for updates but doesn't download automatically
  autoUpdater.checkForUpdates();
});

// Add these new IPC handlers
ipcMain.handle('download-update', (event, arg) => {
  // Manually trigger the download when user approves
  autoUpdater.downloadUpdate();
});

ipcMain.handle('install-update', (event, arg) => {
  // Manually trigger the installation
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('open-external', (event, url: string) => {
  // Open external links in the user's default browser
  shell.openExternal(url);
});

ipcMain.handle('show-save-dialog', async (event, options: {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}) => {
  if (!mainWindow) {
    return { canceled: true };
  }

  // Get the Documents directory path
  const documentsPath = app.getPath('documents');
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || path.join(documentsPath, 'chronique.jchronic'),
    filters: options.filters || [
      { name: 'Fichiers Chronique', extensions: ['jchronic'] },
      { name: 'Tous les fichiers', extensions: ['*'] },
    ],
  });

  return result;
});

ipcMain.handle('write-file', async (event, filePath: string, data: string) => {
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (error) {
    log.error('Error writing file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('show-open-dialog', async (event, options: {
  filters?: { name: string; extensions: string[] }[];
}) => {
  if (!mainWindow) {
    return { canceled: true };
  }

  // Get the Documents directory path
  const documentsPath = app.getPath('documents');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: documentsPath,
    filters: options.filters || [
      { name: 'Fichiers Chronique', extensions: ['jchronic', 'chronic'] },
      { name: 'Tous les fichiers', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  return result;
});

ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    log.error('Error reading file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

ipcMain.handle('read-file-binary', async (event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath);
    // Convert Buffer to base64 for transmission
    const base64 = data.toString('base64');
    return { success: true, data: base64 };
  } catch (error) {
    log.error('Error reading binary file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

ipcMain.handle('get-file-stats', async (event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return { 
      success: true, 
      size: stats.size,
      isFile: stats.isFile(),
      exists: true
    };
  } catch (error) {
    log.error('Error getting file stats:', error);
    return { 
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

// Optional: Disable auto-download
autoUpdater.autoDownload = false;

// ************