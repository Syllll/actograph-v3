/**
 * Composable useHaptics - Feedback haptique pour actions critiques
 *
 * Utilise @capacitor/haptics sur les plateformes natives (Android/iOS).
 * No-op gracieux sur le web.
 *
 * @author Sylvain Meylan
 */
import { Capacitor } from '@capacitor/core';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

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
        await h.impact({ style: ImpactStyle.Light });
      } catch {
        // Ignore haptics errors (e.g. unsupported device)
      }
    }
  };

  const impactMedium = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.impact({ style: ImpactStyle.Medium });
      } catch {
        // Ignore
      }
    }
  };

  const notificationSuccess = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.notification({ type: NotificationType.Success });
      } catch {
        // Ignore
      }
    }
  };

  const notificationWarning = async () => {
    const h = await getHaptics();
    if (h) {
      try {
        await h.notification({ type: NotificationType.Warning });
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
