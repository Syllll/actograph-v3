import { boot } from 'quasar/wrappers';
import { Buffer } from 'buffer';

/**
 * Pose le polyfill `Buffer` (paquet `buffer`) en global avant tout code métier.
 *
 * Le parser `.chronic` v1 (`@actograph/core/import/chronic-v1`) et la lib
 * `int64-buffer` référencent `Buffer` en tant que variable globale (Node).
 * Dans une WebView Capacitor ce global n'existe pas nativement ; sans cette
 * injection, tout appel au parser hors du chemin `toBuffer()` planterait avec
 * `Buffer is not defined`. On le pose une fois pour toutes au démarrage.
 */
export default boot(() => {
  const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  if (typeof g.Buffer === 'undefined') {
    g.Buffer = Buffer;
  }
});
