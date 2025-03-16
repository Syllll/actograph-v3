'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.exists = exports.removeFile = exports.createFolderIfNeeded = void 0;
const fs = require('fs');
const createFolderIfNeeded = async (path) => {
  if (!(await (0, exports.exists)(path))) {
    const splittedPath = path.split('/');
    let currentPath = '';
    for (const p of splittedPath) {
      currentPath += p + '/';
      if (p.length > 0 && p !== '.') {
        if (!(await (0, exports.exists)(currentPath))) {
          await fs.promises.mkdir(currentPath);
        }
      }
    }
  }
};
exports.createFolderIfNeeded = createFolderIfNeeded;
const removeFile = async (path) => {
  if (await (0, exports.exists)(path)) {
    await fs.promises.rm(path);
  }
};
exports.removeFile = removeFile;
const exists = async (path) =>
  !!(await fs.promises.stat(path).catch((e) => false));
exports.exists = exists;
//# sourceMappingURL=index.js.map
