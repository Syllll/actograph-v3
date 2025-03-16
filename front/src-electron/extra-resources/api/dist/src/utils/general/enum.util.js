'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.enumValues = exports.enumKeys = void 0;
function enumKeys(obj) {
  return Object.keys(obj).filter((k) => Number.isNaN(+k));
}
exports.enumKeys = enumKeys;
function enumValues(obj) {
  const keys = enumKeys(obj);
  const values = [];
  for (const key of keys) {
    values.push(obj[key]);
  }
  return values;
}
exports.enumValues = enumValues;
//# sourceMappingURL=enum.util.js.map
