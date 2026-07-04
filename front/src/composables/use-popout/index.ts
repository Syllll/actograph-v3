/**
 * Use Popout Composable
 * =====================
 *
 * Suit l'état d'incrustation des panneaux (vidéo / boutons) dans des fenêtres
 * OS séparées. La fenêtre principale (owner) utilise cet état pour masquer le
 * panneau correspondant et afficher un emplacement "incrusté ailleurs", puis le
 * réintégrer automatiquement quand la fenêtre pop-out se ferme.
 *
 * La communication passe par le bus `use-window-sync` :
 * - `popout:opened` / `popout:alive` : un panneau est ouvert dans une fenêtre
 *   séparée (heartbeat régulier pour détecter une fermeture brutale).
 * - `popout:closed` : la fenêtre pop-out se ferme proprement.
 * - `popout:close-requested` : l'owner demande à la fenêtre pop-out de se fermer,
 *   même si la référence `Window` locale a été perdue après un refresh.
 *
 * Un nettoyage par expiration (staleness) côté owner réintègre le panneau si la
 * fenêtre pop-out a disparu sans envoyer `popout:closed` (crash, kill, etc.).
 */
import { reactive } from 'vue';
import { useWindowSync } from '../use-window-sync';

export type PopoutComponent = 'video' | 'buttons';

const COMPONENTS: PopoutComponent[] = ['video', 'buttons'];

// Heartbeat émis par la fenêtre pop-out, et délai au-delà duquel l'owner
// considère la fenêtre comme disparue.
const HEARTBEAT_INTERVAL_MS = 2000;
const STALE_TIMEOUT_MS = 6000;

const sharedState = reactive<Record<PopoutComponent, boolean>>({
  video: false,
  buttons: false,
});

const lastSeen: Record<PopoutComponent, number> = {
  video: 0,
  buttons: 0,
};

let initialized = false;
let stalenessTimer: number | null = null;

const isPopoutComponent = (value: unknown): value is PopoutComponent =>
  value === 'video' || value === 'buttons';

const ensureInitialized = () => {
  if (initialized) return;
  initialized = true;

  const windowSync = useWindowSync();

  const markSeen = (component: PopoutComponent) => {
    sharedState[component] = true;
    lastSeen[component] = Date.now();
  };

  windowSync.on('popout:opened', (payload: { component?: unknown }) => {
    if (isPopoutComponent(payload?.component)) markSeen(payload.component);
  });
  windowSync.on('popout:alive', (payload: { component?: unknown }) => {
    if (isPopoutComponent(payload?.component)) markSeen(payload.component);
  });
  windowSync.on('popout:closed', (payload: { component?: unknown }) => {
    if (isPopoutComponent(payload?.component)) {
      sharedState[payload.component] = false;
      lastSeen[payload.component] = 0;
    }
  });

  // Réintégration automatique si une fenêtre pop-out disparaît sans prévenir.
  if (windowSync.isOwner && typeof window !== 'undefined') {
    stalenessTimer = window.setInterval(() => {
      const now = Date.now();
      COMPONENTS.forEach((component) => {
        if (
          sharedState[component] &&
          lastSeen[component] > 0 &&
          now - lastSeen[component] > STALE_TIMEOUT_MS
        ) {
          sharedState[component] = false;
          lastSeen[component] = 0;
        }
      });
    }, HEARTBEAT_INTERVAL_MS);
  }
};

export const usePopout = () => {
  ensureInitialized();
  const windowSync = useWindowSync();

  /** Marque (et diffuse) l'ouverture d'un panneau dans une fenêtre séparée. */
  const markOpened = (component: PopoutComponent) => {
    sharedState[component] = true;
    lastSeen[component] = Date.now();
    windowSync.broadcast('popout:opened', { component });
  };

  /** Marque (et diffuse) la fermeture d'un panneau incrusté. */
  const markClosed = (component: PopoutComponent) => {
    sharedState[component] = false;
    lastSeen[component] = 0;
    windowSync.broadcast('popout:closed', { component });
  };

  /** Demande à la fenêtre pop-out de se fermer elle-même. */
  const requestClose = (component: PopoutComponent) => {
    windowSync.broadcast('popout:close-requested', { component });
  };

  /** Signale que la fenêtre pop-out est toujours vivante (heartbeat). */
  const heartbeat = (component: PopoutComponent) => {
    windowSync.broadcast('popout:alive', { component });
  };

  return {
    sharedState,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    markOpened,
    markClosed,
    requestClose,
    heartbeat,
  };
};
