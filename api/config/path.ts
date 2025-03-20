import * as fs from 'fs';

// Get the path to the config directory
export const getConfigPath = async (): Promise<string> => {
  // Force TypeScript to use dynamic import syntax in the output
  const importedModule = await Function('return import("env-paths")')();

  // macos path: /Users/jeremy/Library/Application Support/actograph
  // windows path: C:\Users\jeremy\AppData\Roaming\actograph
  // linux path: /home/jeremy/.config/actograph

  // Get the default export or the module itself
  const envPaths = importedModule.default || importedModule;
  const paths = envPaths('actograph', { suffix: '' });
  const configPath = paths.config;

  // Check the directory exists
  // env-paths does not create the directory if it does not exist
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  return configPath;
};



