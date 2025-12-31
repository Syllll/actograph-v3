// @ts-nocheck

import * as util from './src/util';
import types from './src/types';
import buffer from './src/buffer';
import socket from './src/socket';
import transform from './src/transform';
import serialization from './src/serialization';

// Export par défaut avec assertion de type pour éviter les erreurs de types privés
export default {
  util: { ...util },
  types,
  buffer,
  socket,
  transform,
  serialization,
} as any;

