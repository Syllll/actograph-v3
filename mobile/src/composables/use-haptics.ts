/**
 * Composable useHaptics - Feedback haptique pour actions critiques
 *
 * Utilise @capacitor/haptics sur les plateformes natives (Android/iOS).
 * No-op gracieux sur le web.
 *
 * @author Sylvain Meylan
 */
import { Capacitor } from '@capacitor/core';

let Haptics: typeof import('@capacitor/haptics').Haptics | null = null;

async function getHaptics() {
  if (Haptics) return Haptics;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    Haptics = (await import('@capacitor/haptics')).Haptics;
    return Haptics;
  } catch {
    return null;
  }
}

export function useHaptics() {
  const impactLight = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.impact({ style: 'light' });
      } catch {
        // Ignore haptics errors (e.g. unsupported device)
      }
    }
  };

  const impactMedium = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.impact({ style: 'medium' });
      } catch {
        // Ignore
      }
    }
  };

  const notificationSuccess = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.notification({ type: 'success' });
      } catch {
        // Ignore
      }
    }
  };

  const notificationWarning = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.notification({ type: 'warning' });
      } catch {
        // Ignore
      }
    }
  };

  return {
    impactLight,
    impactMedium,
    notificationSuccess,
    notificationWarning,
  };
}
