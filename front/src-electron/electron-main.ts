import { app, BrowserWindow, nativeTheme, screen, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
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
autoUpdater.logger.transports.file.level = "info";

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

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width,
    height,
    minWidth: 700,
    minHeight: 400,
    autoHideMenuBar: true,
    useContentSize: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD || ''),
    },
  });

  // Load the URL with query parameters
  mainWindow.loadURL(<string>process.env.APP_URL + '?serverPort=' + serverPort + '&targetRoute=/gateway');


  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    /*mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });*/

    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });


  autoUpdater.checkForUpdatesAndNotify();

  // Auto-Update Event Listeners
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new update is available. Downloading now...',
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. It will be installed on restart.',
      buttons: ['Restart', 'Later']
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
  });
}

/**
 * Creates a background process that runs the server.
 * In electron, the server is run as a subprocess. The server is a nestjs instance using sqlite as database.
 * @param port The port to run the server on
 */
function createBackgroundProcess(port: number) {
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
    app.getPath('userData'), // This gets the per-user application data directory
  );

  // stdio ensure we can capture all output streams
  serverProcess = fork(serverPath, ['--subprocess', port.toString(), envPath, dbPath], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      PROD: 'true'
    }
  });

  // Listeners for both stdout and stderr streams
  // Prefixes to the console output ([Server Process] and [Server Process Error]) 
  // to distinguish the child process output from the main process output
  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[Server Process] ${data.toString().trim()}`);
  });
  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[Server Process Error] ${data.toString().trim()}`);
  });

  serverProcess.on('message', (msg: string) => {
    console.log('message:', msg);
  });
}

app.whenReady().then(async () => {
  if (process.env.PROD) {
    serverPort = await getPort();
    createBackgroundProcess(serverPort);
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

// ************
