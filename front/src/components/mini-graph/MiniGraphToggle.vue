<template>
  <q-btn flat dense no-caps icon="query_stats" :label="$t('miniGraph.title')"
    :color="miniGraph.requested.value ? 'primary' : undefined"
    :aria-pressed="miniGraph.requested.value ? 'true' : 'false'"
    :disable="observation.sharedState.loading || !observation.protocol.sharedState.currentProtocol"
    @click="miniGraph.toggle">
    <q-tooltip>{{ $t('miniGraph.toggleHint') }}</q-tooltip>
  </q-btn>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { useMiniGraph } from 'src/composables/use-mini-graph';
import { useObservation } from 'src/composables/use-observation';
export default defineComponent({
  name: 'MiniGraphToggle',
  setup() { return { miniGraph: useMiniGraph(), observation: useObservation() }; },
});
</script>
