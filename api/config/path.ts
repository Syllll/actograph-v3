import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getMode } from './mode';
import {
  readAccessFile,
  writeAccessFile,
} from '../src/core/security/services/access-file';

/**
 * Get the platform-specific config path for the application.
 * This is an inlined version of the `env-paths` package logic to avoid
 * ESM/bundling issues with esbuild.
 *
 * Paths returned:
 * - macOS: ~/Library/Application Support/actograph
 * - Windows: C:\Users\<user>\AppData\Roaming\actograph
 * - Linux: ~/.config/actograph (XDG_CONFIG_HOME or default)
 */
const getEnvConfigPath = (appName: string): string => {
  const homedir = os.homedir();
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS
    return path.join(homedir, 'Library', 'Application Support', appName);
  }

  if (platform === 'win32') {
    // Windows - use APPDATA environment variable or fallback
    const appData =
      process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
    return path.join(appData, appName);
  }

  // Linux and other Unix-like systems - follow XDG Base Directory Specification
  const xdgConfig =
    process.env.XDG_CONFIG_HOME || path.join(homedir, '.config');
  return path.join(xdgConfig, appName);
};

// Get the path to the config directory
export const getConfigPath = async (): Promise<string> => {
  // macos path: /Users/jeremy/Library/Application Support/actograph
  // windows path: C:\Users\jeremy\AppData\Roaming\actograph
  // linux path: /home/jeremy/.config/actograph

  const configPath =
    getMode() === 'electron' && process.env.PROD && process.argv[5]
      ? process.argv[5]
      : getEnvConfigPath('actograph');

  // Check the directory exists and create it if not
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  // Preserve licenses saved by older desktop versions that computed their own
  // config directory, instead of using Electron's userData.
  const migrationMarker = path.join(configPath, '.access-path-migrated');
  if (
    getMode() === 'electron' &&
    process.env.PROD &&
    !fs.existsSync(migrationMarker)
  ) {
    const destination = path.join(configPath, 'access.json');
    const legacyPaths = [getEnvConfigPath('actograph')];
    if (process.platform === 'linux')
      legacyPaths.push(path.join(os.homedir(), '.config', 'actograph'));
    if (process.platform === 'win32')
      legacyPaths.push(
        path.join(os.homedir(), 'AppData', 'Roaming', 'actograph'),
      );
    if (!fs.existsSync(destination)) {
      for (const legacyPath of legacyPaths) {
        if (path.resolve(legacyPath) === path.resolve(configPath)) continue;
        const access = await readAccessFile(
          path.join(legacyPath, 'access.json'),
        );
        if (access) {
          await writeAccessFile(destination, access);
          break;
        }
      }
    }
    // Remember the migration even when no legacy license exists. Removing the
    // current access file via "Change license" must never restore an old key.
    try {
      await fs.promises.writeFile(migrationMarker, '', {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  return configPath;
};
