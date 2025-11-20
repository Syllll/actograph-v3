import * as fs from 'fs';
import { IChronic } from './../file-structure/chronic';
import { exportToBuffer, importFromBuffer } from '../file-structure/chronic';

// const qtdatastream = require('./../qtdatastream');
import qtdatastream from '../qtdatastream';
import { CustomBuffer } from '../qtdatastream/src/buffer';
const types = <any>qtdatastream.types;

export const exportChronic = async (chronic: IChronic): Promise<Buffer> => {
  console.log('Before Export');
  const buffer = exportToBuffer(chronic, {});
  console.log('After Export');

  return buffer;
};
