import type { MiniGraphSnapshot } from './mini-graph-data';

export type MiniGraphMessage =
  | { type: 'ready' | 'ping' | 'owner' | 'close' | 'attach' | 'closed' }
  | { type: 'snapshot'; revision: number; snapshot: MiniGraphSnapshot };

export const miniGraphChannelName = (session: string) => `actograph-mini-graph:${session}`;

/** Dedicated transport: never joins the observation mutation/autosave bus. */
export function openMiniGraphWindow(options: {
  snapshot: () => MiniGraphSnapshot | null;
  onDetached: () => void;
  onAttached: () => void;
  onFailure: () => void;
}): { publish: () => void; close: () => void } | null {
  if (typeof BroadcastChannel === 'undefined') { options.onFailure(); return null; }
  let session: string;
  let channel: BroadcastChannel;
  try {
    session = crypto.randomUUID();
    channel = new BroadcastChannel(miniGraphChannelName(session));
  } catch { options.onFailure(); return null; }
  let popup: Window | null = null;
  let stopped = false;
  let ready = false;
  let revision = 0;
  let lastSeen = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  const send = (message: MiniGraphMessage) => { if (!stopped) channel.postMessage(message); };
  const close = () => {
    if (stopped) return;
    send({ type: 'close' });
    stopped = true;
    if (timer !== null) clearInterval(timer);
    channel.onmessage = null;
    channel.close();
    try { popup?.close(); } catch { /* The heartbeat also closes an orphan. */ }
    popup = null;
  };
  const attach = () => { close(); options.onAttached(); };
  const publish = () => {
    const snapshot = options.snapshot();
    if (ready && snapshot) {
      // Strip Vue proxies and serialize Dates. The child normalizes its private copy.
      send({ type: 'snapshot', revision: ++revision, snapshot: JSON.parse(JSON.stringify(snapshot)) });
    }
  };
  channel.onmessage = (event: MessageEvent<MiniGraphMessage>) => {
    if (stopped || !event.data) return;
    if (event.data.type === 'ready') {
      lastSeen = Date.now();
      if (!ready) { ready = true; options.onDetached(); }
      publish();
    } else if (event.data.type === 'ping') lastSeen = Date.now();
    else if (event.data.type === 'attach' || event.data.type === 'closed') attach();
  };
  const url = new URL(window.location.href);
  url.hash = `/popup/mini-graph?session=${session}`;
  try { popup = window.open(url.href, `mini-graph-${session}`, 'popup,width=800,height=480,resizable=yes'); }
  catch { /* Retain the floating panel if opening is unavailable. */ }
  if (!popup) { close(); options.onFailure(); return null; }
  timer = setInterval(() => {
    if (popup?.closed || Date.now() - lastSeen > (ready ? 8000 : 20000)) {
      const failedToOpen = !ready;
      attach();
      if (failedToOpen) options.onFailure();
      return;
    }
    send({ type: 'owner' });
  }, 1000);
  return { publish, close };
}
