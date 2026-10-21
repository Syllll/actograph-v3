import { ref } from 'vue';

// Only the user's intent survives a tab change; engines and channels are scoped to the host.
const requested = ref(false);
export function useMiniGraph() {
  return { requested, toggle: () => { requested.value = !requested.value; } };
}
