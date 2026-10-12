export type DesktopUpdatePhase =
  | 'idle'
  | 'downloading'
  | 'preparing'
  | 'ready'
  | 'installing'
  | 'error';

export interface DesktopUpdateState {
  phase: DesktopUpdatePhase;
  error?: string;
  code?: 'preparation-timeout' | 'installation-timeout';
}
