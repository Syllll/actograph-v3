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
import { fork, execSync } from 'child_process';
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
      // Allow loading local files via file:// protocol for video streaming
      // This is safe in Electron desktop app context since we already have file system access via IPC
      webSecurity: false,
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

  // Configure autoUpdater BEFORE setting up event listeners
  // Disable auto-download - user must approve first
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

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
    log.error('Update error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    if (mainWindow) {
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
}

/**
 * Checks if API node_modules extraction is needed.
 * Returns true if ZIP exists and node_modules doesn't.
 */
function isApiExtractionNeeded(): boolean {
  if (!process.env.PROD) return false;
  
  const apiBasePath = path.join(
    process.resourcesPath,
    'src-electron/extra-resources/api'
  );
  const zipPath = path.join(apiBasePath, 'api-node-modules.zip');
  const nodeModulesPath = path.join(apiBasePath, 'dist', 'node_modules');

  if (!fs.existsSync(zipPath)) {
    return false;
  }

  if (fs.existsSync(nodeModulesPath)) {
    // Clean up the ZIP file since extraction is already done
    try {
      fs.unlinkSync(zipPath);
      log.info('Cleaned up leftover ZIP file');
    } catch (e) {
      log.warn('Failed to delete ZIP file:', e);
    }
    return false;
  }

  return true;
}

/**
 * Extracts the API node_modules ZIP with progress reporting.
 * Called on first launch when ZIP exists and node_modules doesn't.
 * Sends progress updates to the renderer process.
 */
async function extractApiModules(): Promise<void> {
  const AdmZip = require('adm-zip');
  
  const apiBasePath = path.join(
    process.resourcesPath,
    'src-electron/extra-resources/api'
  );
  const zipPath = path.join(apiBasePath, 'api-node-modules.zip');
  const destPath = path.join(apiBasePath, 'dist');

  log.info('Extracting API node_modules from ZIP (first launch)...');
  
  // Notify renderer that extraction is starting
  if (mainWindow) {
    mainWindow.webContents.send('first-launch-extraction', {
      status: 'extracting',
      message: 'Préparation de l\'application...',
      progress: 0,
    });
  }

  try {
    // Use adm-zip for extraction with progress
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    const totalEntries = zipEntries.length;
    let extractedCount = 0;
    let lastReportedPercent = 0;

    log.info(`ZIP contains ${totalEntries} entries`);

    // Extract entries one by one to report progress
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const targetPath = path.join(destPath, entry.entryName);
        const targetDir = path.dirname(targetPath);
        
        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Extract file
        fs.writeFileSync(targetPath, entry.getData());
      }
      
      extractedCount++;
      const percent = Math.round((extractedCount / totalEntries) * 100);
      
      // Report progress every 5% to avoid flooding IPC
      if (percent >= lastReportedPercent + 5 || percent === 100) {
        lastReportedPercent = percent;
        
        if (mainWindow) {
          mainWindow.webContents.send('first-launch-extraction', {
            status: 'extracting',
            message: `Extraction en cours... ${percent}%`,
            progress: percent,
          });
        }
      }
    }

    log.info('API node_modules extracted successfully');

    // Delete the ZIP file after successful extraction
    fs.unlinkSync(zipPath);
    log.info('ZIP file cleaned up');

    // Notify renderer that extraction is complete
    if (mainWindow) {
      mainWindow.webContents.send('first-launch-extraction', {
        status: 'completed',
        message: 'Extraction terminée !',
        progress: 100,
      });
    }
  } catch (error) {
    log.error('Failed to extract API node_modules:', error);
    
    // Notify renderer of failure
    if (mainWindow) {
      mainWindow.webContents.send('first-launch-extraction', {
        status: 'error',
        message: 'Erreur lors de la préparation de l\'application.',
        progress: 0,
      });
    }
    
    throw error;
  }
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
  // Check if first-launch extraction is needed BEFORE creating window
  const needsExtraction = isApiExtractionNeeded();
  
  if (process.env.PROD) {
    serverPort = await getPort();
  }

  // Create window first (with extraction mode if needed)
  // This allows us to show a loading indicator during extraction
  await createWindow();

  if (process.env.PROD) {
    // If extraction is needed, do it now (window is ready to show progress)
    if (needsExtraction) {
      try {
        await extractApiModules();
      } catch (err) {
        log.error('Failed to extract API modules:', err);
        // Continue anyway, maybe we can still start
      }
    }

    // Notify renderer that we're starting the server
    if (mainWindow) {
      mainWindow.webContents.send('first-launch-extraction', {
        status: 'starting-server',
        message: 'Démarrage du serveur...',
      });
    }

    // We try to start the backend several times, in case it does not work (windows...)
    let backendStarted = false;
    let tryCount = 0;
    while (tryCount < 3 && backendStarted === false) {
      tryCount++;
      try {
        await createBackgroundProcess(serverPort);
        backendStarted = true;
      } catch (err) {
        console.error(err);
        backendStarted = false;
      }
    }

    // Notify renderer that app is ready
    if (mainWindow) {
      mainWindow.webContents.send('first-launch-extraction', {
        status: 'ready',
        message: 'Application prête !',
        serverPort: serverPort,
      });
    }
  }
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

ipcMain.handle('ready-to-check-updates', async (event, arg) => {
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
ipcMain.handle('download-update', async (event, arg) => {
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

ipcMain.handle('install-update', (event, arg) => {
  // Manually trigger the installation
  try {
    log.info('Installing update and quitting...');
    // quitAndInstall(restart, isSilent)
    // restart: if true, restart the app after installation
    // isSilent: if true, run installer in silent mode
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    log.error('Error installing update:', error);
    throw error;
  }
});

ipcMain.on('open-external', (event, url: string) => {
  // Open external links in the user's default browser
  shell.openExternal(url);
});

ipcMain.handle('get-actograph-folder', async (event) => {
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

ipcMain.handle('get-autosave-folder', async (event) => {
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

ipcMain.handle('list-autosave-files', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const autosaveFolder = path.join(userDataPath, 'autosave');
    
    if (!fs.existsSync(autosaveFolder)) {
      return { success: true, files: [] };
    }
    
    const files = fs.readdirSync(autosaveFolder)
      .filter(file => file.endsWith('.jchronic'))
      .map(file => {
        const filePath = path.join(autosaveFolder, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()); // Most recent first
    
    return { success: true, files };
  } catch (error) {
    log.error('Error listing autosave files:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      files: [] 
    };
  }
});

ipcMain.handle('delete-autosave-file', async (event, filePath: string) => {
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
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

ipcMain.handle('cleanup-old-autosave', async (event, maxAgeDays: number = 7) => {
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
      deleted: 0 
    };
  }
});

ipcMain.handle('show-save-dialog', async (event, options: {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}) => {
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
    log.warn('Failed to get/create Actograph folder, using Documents:', error);
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

// ************