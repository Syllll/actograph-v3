// @ts-nocheck

import * as util from './src/util';
import types from './src/types';
import buffer from './src/buffer';
import socket from './src/socket';
import transform from './src/transform';
import serialization from './src/serialization';

// Export par défaut avec @ts-ignore pour éviter les erreurs de types privés
// Les modules utilisent des types internes Node.js (StaticEventEmitterIteratorOptions, StaticEventEmitterOptions)
// qui ne sont pas exportés publiquement mais qui sont utilisés dans les dépendances internes
// @ts-ignore TS4082 - Default export has or is using private name
export default {
  util: { ...util },
  types,
  buffer,
  socket,
  transform,
  serialization,
};

