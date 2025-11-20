import * as fs from 'fs';
import {
  exportToBuffer,
  importFromBuffer,
  IChronic,
} from '../file-structure/chronic';

// const qtdatastream = require('./../qtdatastream');
import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
const types = <any>qtdatastream.types;

export const importChronic = (fileContent: Buffer): IChronic => {
  // Put the file in a custom buffer
  const customBuffer = new CustomBuffer(fileContent);

  // console.log('Before Import');
  const chronic = importFromBuffer(<any>customBuffer, {});
  // console.log('After Import', chronic);

  return chronic;
};
