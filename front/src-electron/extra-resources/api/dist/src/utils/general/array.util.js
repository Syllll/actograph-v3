"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayToObject = exports.mergeObjectsArrayInSingleObject = exports.average = exports.sum = exports.removeDuplicates = exports.sortArray = void 0;
const sortArray = (array, prop) => array.sort((a, b) => (a[prop] > b[prop] ? 1 : a[prop] < b[prop] ? -1 : 0));
exports.sortArray = sortArray;
const removeDuplicates = (target) => [
    ...new Set(target),
];
exports.removeDuplicates = removeDuplicates;
const sum = (array) => array.reduce((a, b) => a + b, 0);
exports.sum = sum;
const average = (array) => (0, exports.sum)(array) / array.length;
exports.average = average;
const mergeObjectsArrayInSingleObject = (finalObject, currentObject) => Object.assign(finalObject, currentObject);
exports.mergeObjectsArrayInSingleObject = mergeObjectsArrayInSingleObject;
const arrayToObject = (array) => {
    return array.reduce((acc, curr) => ((acc[curr] = true), acc), {});
};
exports.arrayToObject = arrayToObject;
//# sourceMappingURL=array.util.js.map