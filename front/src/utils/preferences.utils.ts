const PREFERENCES_STORAGE_KEY = 'actograph_preferences';

export interface IActographPreferences {
  locale: string;
  darkMode: boolean;
}

const DEFAULT_PREFERENCES: IActographPreferences = {
  locale: 'fr',
  darkMode: false,
};

export function loadPreferences(): IActographPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(stored) as Partial<IActographPreferences>;
    return {
      locale: typeof parsed.locale === 'string' ? parsed.locale : DEFAULT_PREFERENCES.locale,
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : DEFAULT_PREFERENCES.darkMode,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: IActographPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
}
