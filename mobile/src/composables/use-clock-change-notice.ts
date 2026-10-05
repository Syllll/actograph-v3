import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getClockChangeNotice } from '@utils/clock-change';

const REFRESH_MS = 30 * 1000;

/** Warning about the clock going back, refreshed while the app is visible. */
export function useClockChangeNotice() {
  const now = ref(Date.now());
  const dismissedKey = ref<string | null>(null);
  let interval: number | null = null;

  const refresh = () => {
    now.value = Date.now();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') refresh();
  };

  onMounted(() => {
    interval = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onUnmounted(() => {
    if (interval !== null) window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  const notice = computed(() => {
    const current = getClockChangeNotice(now.value);
    return current && current.key !== dismissedKey.value ? current : null;
  });

  const dismiss = () => {
    dismissedKey.value = notice.value?.key ?? null;
  };

  return { notice, dismiss };
}
