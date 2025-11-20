// @ts-nocheck

import * as util from './src/util';
import types from './src/types';
import buffer from './src/buffer';
import socket from './src/socket';
import transform from './src/transform';
import serialization from './src/serialization';

// Export par défaut avec assertion de type pour éviter les erreurs de types privés
// Les modules utilisent des types internes Node.js (StaticEventEmitterIteratorOptions, StaticEventEmitterOptions)
// qui ne sont pas exportés publiquement mais qui sont utilisés dans les dépendances internes
// Utilisation de 'as any' pour contourner TS4082 lors de la compilation avec declaration: true
export default {
  util: { ...util },
  types,
  buffer,
  socket,
  transform,
  serialization,
} as any;

