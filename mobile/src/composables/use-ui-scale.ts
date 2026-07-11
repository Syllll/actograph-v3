/**
 * Composable useUiScale - Facteur d'échelle global de l'UI d'observation.
 *
 * Permet à l'utilisateur d'ajuster la taille globale des catégories et
 * observables (largeur par défaut, fontes, paddings) selon son appareil.
 *
 * Le facteur est persisté par appareil via @capacitor/preferences (clé
 * `actograph.uiScale`). Il est exposé comme une variable CSS `--ui-scale`
 * posée sur le conteneur d'observation et consommée par DraggableCategory.
 *
 * Plage: 0.6 (compact) à 1.8 (grand). Défaut: 1.
 *
 * @author Sylvain Meylan
 */
import { reactive } from 'vue';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'actograph.uiScale';

export const UI_SCALE_MIN = 0.6;
export const UI_SCALE_MAX = 1.8;
export const UI_SCALE_STEP = 0.05;
export const UI_SCALE_DEFAULT = 1;

interface UiScaleState {
  scale: number;
  loaded: boolean;
}

// Singleton réactif partagé entre tous les consommateurs.
const state = reactive<UiScaleState>({
  scale: UI_SCALE_DEFAULT,
  loaded: false,
});

function clampScale(value: number): number {
  if (isNaN(value)) return UI_SCALE_DEFAULT;
  return Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, value));
}

async function load(): Promise<void> {
  if (state.loaded) return;
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      state.scale = clampScale(Number(value));
    }
  } catch (error) {
    console.warn('Failed to load uiScale from Preferences:', error);
  } finally {
    state.loaded = true;
  }
}

async function persist(): Promise<void> {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: String(state.scale) });
  } catch (error) {
    console.warn('Failed to persist uiScale:', error);
  }
}

export function useUiScale() {
  return {
    state,
    min: UI_SCALE_MIN,
    max: UI_SCALE_MAX,
    step: UI_SCALE_STEP,
    defaultScale: UI_SCALE_DEFAULT,
    load,
    /** Applique et persiste un nouveau facteur (borné automatiquement). */
    setScale: async (scale: number): Promise<void> => {
      state.scale = clampScale(scale);
      await persist();
    },
  };
}
