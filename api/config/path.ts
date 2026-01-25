import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
    const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
    return path.join(appData, appName);
  }

  // Linux and other Unix-like systems - follow XDG Base Directory Specification
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(homedir, '.config');
  return path.join(xdgConfig, appName);
};

// Get the path to the config directory
export const getConfigPath = async (): Promise<string> => {
  // macos path: /Users/jeremy/Library/Application Support/actograph
  // windows path: C:\Users\jeremy\AppData\Roaming\actograph
  // linux path: /home/jeremy/.config/actograph

  const configPath = getEnvConfigPath('actograph');

  // Check the directory exists and create it if not
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  return configPath;
};
