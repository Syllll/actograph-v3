/** Préfixe du username local Electron. */
export const ELECTRON_LOCAL_USER_PREFIX = '_pc-';

/**
 * Dérive le mot de passe local Electron à partir du username (`_pc-{osUser}`).
 * Le suffixe OS peut contenir des tirets.
 */
export function deriveElectronLocalPassword(localUsername: string): string {
  if (localUsername.startsWith(ELECTRON_LOCAL_USER_PREFIX)) {
    return localUsername.slice(ELECTRON_LOCAL_USER_PREFIX.length);
  }
  const parts = localUsername.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join('-');
  }
  return localUsername;
}
