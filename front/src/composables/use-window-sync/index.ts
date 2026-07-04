/**
 * Use Window Sync Composable
 * ==========================
 *
 * Bus de synchronisation temps réel entre fenêtres OS (same-origin) basé sur
 * `BroadcastChannel`. Il permet à la fenêtre principale et aux fenêtres
 * "incrustées" (pop-out vidéo / boutons / relevés, ouvertes via `window.open`)
 * de partager l'état d'une observation sans passer par le backend.
 */
import { nextTick, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export type WindowSyncMessageType =
  | 'state:observation'
  | 'state:observation-meta'
  | 'state:readings'
  | 'state:protocol'
  | 'event:video-reading-active'
  | 'popout:opened'
  | 'popout:closed'
  | 'popout:alive'
  | 'popout:close-requested'
  | 'hydrate:request'
  | 'hydrate:complete';

export interface WindowSyncMessage<T = unknown> {
  senderId: string;
  obsId: number | null;
  type: WindowSyncMessageType;
  payload?: T;
}

type Handler = (payload: any, message: WindowSyncMessage) => void;

const CHANNEL_NAME = 'actograph-window-sync';

const senderId = uuidv4();
const isPopupWindow =
  typeof window !== 'undefined' &&
  !!window.location &&
  window.location.hash.startsWith('#/popup/');
const isOwner = !isPopupWindow;

let currentObsId: number | null = null;
const setObservationId = (id: number | null) => {
  currentObsId = id;
};
const getObservationId = () => currentObsId;

const suppressDepth = ref(0);
const isApplyingRemote = () => suppressDepth.value > 0;

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

    if (
      message.obsId != null &&
      currentObsId != null &&
      message.obsId !== currentObsId
    ) {
      return;
    }

    const set = handlers.get(message.type);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(message.payload, message);
        } catch (error) {
          console.error(`[window-sync] handler error for "${message.type}"`, error);
        }
      });
    }

    // Les composables owner répondent d'abord à `hydrate:request` avec leurs
    // états respectifs. L'accusé part au tick suivant pour permettre aux pop-out
    // de n'activer l'interface qu'après réception des snapshots vivants.
    if (message.type === 'hydrate:request' && isOwner && typeof window !== 'undefined') {
      window.setTimeout(() => {
        broadcast('hydrate:complete', { observationId: currentObsId });
      }, 0);
    }
  };
  return channel;
};

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
