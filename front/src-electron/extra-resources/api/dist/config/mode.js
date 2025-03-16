'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getMode = void 0;
const getMode = () => {
  const isRunningAsSubprocess = process.argv[2] === '--subprocess';
  if (isRunningAsSubprocess) {
    return 'electron';
  }
  if (process.env.DEV_ELECTRON) {
    return 'electron';
  }
  return 'web';
};
exports.getMode = getMode;
//# sourceMappingURL=mode.js.map
