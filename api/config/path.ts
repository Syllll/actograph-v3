// Get the path to the config directory
export const getConfigPath = async (): Promise<string> => {
  // Force TypeScript to use dynamic import syntax in the output
  const importedModule = await Function('return import("env-paths")')();
  // Get the default export or the module itself
  const envPaths = importedModule.default || importedModule;
  const paths = envPaths('actograph', { suffix: '' });
  return paths.config;
};



