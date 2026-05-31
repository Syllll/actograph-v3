/**
 * Use Window Sync Composable
 * ==========================
 *
 * Bus de synchronisation temps réel entre fenêtres OS (same-origin) basé sur
 * `BroadcastChannel`. Il permet à la fenêtre principale et aux fenêtres
 * "incrustées" (pop-out vidéo / boutons / relevés, ouvertes via `window.open`)
 * de partager l'état d'une observation sans passer par le backend.
 *
 * Topologie retenue :
 * - UNE fenêtre "propriétaire" (owner) : la fenêtre principale (toute fenêtre
 *   qui n'est pas sur une route `#/popup/...`). Elle seule écrit au backend
 *   (boucle de synchronisation des relevés) et fait autorité lors d'une
 *   demande d'hydratation.
 * - Des fenêtres "suiveuses" (followers) : les pop-out. Elles n'écrivent jamais
 *   au backend ; elles émettent des changements via le canal et appliquent les
 *   états reçus.
 *
 * Points clés de robustesse :
 * - Anti-écho : chaque message porte l'id de l'émetteur ; on ignore ses propres
 *   messages. De plus, un compteur de suppression (`applyRemote`) empêche les
 *   watchers d'intégration de re-diffuser un état que l'on vient d'appliquer.
 * - Clonage : `BroadcastChannel` utilise le structured clone, incompatible avec
 *   les proxies réactifs de Vue. On sérialise donc via un round-trip JSON
 *   (`safeClone`) ; les champs `Date` sont reconstruits côté récepteur par le
 *   code d'intégration.
 */
import { nextTick, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export type WindowSyncMessageType =
  | 'state:observation'
  | 'state:readings'
  | 'state:protocol'
  | 'event:video-reading-active'
  | 'popout:opened'
  | 'popout:closed'
  | 'popout:alive'
  | 'hydrate:request';

export interface WindowSyncMessage<T = unknown> {
  senderId: string;
  obsId: number | null;
  type: WindowSyncMessageType;
  payload?: T;
}

type Handler = (payload: any, message: WindowSyncMessage) => void;

const CHANNEL_NAME = 'actograph-window-sync';

// Identité et rôle, figés pour toute la durée de vie de la fenêtre.
// Une fenêtre pop-out charge directement la route `#/popup/...` et n'en sort
// jamais ; la fenêtre principale n'est jamais sur cette route. La détection au
// chargement est donc stable.
const senderId = uuidv4();
const isPopupWindow =
  typeof window !== 'undefined' &&
  !!window.location &&
  window.location.hash.startsWith('#/popup/');
const isOwner = !isPopupWindow;

// Observation suivie par cette fenêtre (renseignée par le code d'intégration).
// Sert à filtrer les messages concernant une autre observation.
let currentObsId: number | null = null;
const setObservationId = (id: number | null) => {
  currentObsId = id;
};
const getObservationId = () => currentObsId;

// Compteur de suppression : tant qu'il est > 0, les watchers d'intégration ne
// doivent PAS re-diffuser, car nous sommes en train d'appliquer un état reçu
// d'une autre fenêtre (évite les boucles d'écho).
const suppressDepth = ref(0);
const isApplyingRemote = () => suppressDepth.value > 0;

/**
 * Exécute `fn` (mutation locale d'un état partagé) en mode "application
 * distante" : pendant l'exécution et jusqu'au prochain flush des watchers Vue,
 * `isApplyingRemote()` renvoie `true`, ce qui inhibe la re-diffusion.
 *
 * La libération se fait via `nextTick` car les watchers Vue se déclenchent de
 * façon asynchrone (après la mutation synchrone), et doivent encore voir le
 * drapeau actif lors de leur flush.
 */
const applyRemote = <T>(fn: () => T): T => {
  suppressDepth.value++;
  try {
    return fn();
  } finally {
    void nextTick(() => {
      if (suppressDepth.value > 0) suppressDepth.value--;
    });
  }
};

let channel: BroadcastChannel | null = null;
const handlers = new Map<WindowSyncMessageType, Set<Handler>>();

const ensureChannel = (): BroadcastChannel | null => {
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<WindowSyncMessage>) => {
    const message = event.data;
    if (!message || message.senderId === senderId) return;
    // Filtrer les messages d'une autre observation lorsque les deux ids sont connus.
    if (
      message.obsId != null &&
      currentObsId != null &&
      message.obsId !== currentObsId
    ) {
      return;
    }
    const set = handlers.get(message.type);
    if (!set) return;
    set.forEach((handler) => {
      try {
        handler(message.payload, message);
      } catch (error) {
        console.error(`[window-sync] handler error for "${message.type}"`, error);
      }
    });
  };
  return channel;
};

/**
 * Sérialisation sûre pour `postMessage` : déproxifie les objets réactifs Vue et
 * produit une copie profonde clonable. Les `Date` deviennent des chaînes ISO et
 * sont reconstruites par le code d'intégration côté récepteur.
 */
const safeClone = <T>(value: T): T => {
  if (value === undefined || value === null) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    console.error('[window-sync] safeClone failed', error);
    return value;
  }
};

const broadcast = (type: WindowSyncMessageType, payload?: unknown) => {
  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage({
      senderId,
      obsId: currentObsId,
      type,
      payload: payload === undefined ? undefined : safeClone(payload),
    } as WindowSyncMessage);
  } catch (error) {
    console.error(`[window-sync] postMessage failed for "${type}"`, error);
  }
};

/**
 * Abonne un handler à un type de message. Retourne une fonction de
 * désabonnement.
 */
const on = (type: WindowSyncMessageType, handler: Handler): (() => void) => {
  ensureChannel();
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => {
    handlers.get(type)?.delete(handler);
  };
};

export const useWindowSync = () => {
  return {
    senderId,
    isOwner,
    isPopupWindow,
    setObservationId,
    getObservationId,
    broadcast,
    on,
    isApplyingRemote,
    applyRemote,
  };
};
