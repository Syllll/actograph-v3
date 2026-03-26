import type { Composer } from 'vue-i18n';

let composer: Composer | null = null;

/** Called from app boot so import/export services can translate error messages. */
export function setI18nComposerForServices(c: Composer | undefined): void {
  composer = c ?? null;
}

export function serviceT(
  key: string,
  values?: Record<string, unknown>,
): string {
  if (!composer) return key;
  return String(composer.t(key, values ?? {}));
}
