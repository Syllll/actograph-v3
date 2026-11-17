<template>
  <q-banner v-if="count || ambiguous" dense rounded inline-actions>
    <template #avatar><q-icon name="warning" color="warning" /></template>
    <span v-if="count">{{ $t(analysis ? (count === 1 ? 'exchange.unmatchedAnalysisOne' : 'exchange.unmatchedAnalysis') : (count === 1 ? 'exchange.unmatchedOne' : 'exchange.unmatched'), { count }) }}</span>
    <span v-if="ambiguous"> {{ $t(ambiguous === 1 ? 'exchange.ambiguousOne' : 'exchange.ambiguous', { count: ambiguous }) }}</span>
    <template #action>
      <q-btn flat dense no-caps :label="$t('exchange.show')" @click="show" />
    </template>
  </q-banner>
</template>
<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { unmatchedReadings, ambiguousReadings } from 'src/utils/unmatched-readings';

export default defineComponent({
  name: 'UnmatchedReadingsBanner',
  props: { analysis: { type: Boolean, default: false } },
  emits: ['show'],
  setup(_, { emit }) {
    const observation = useObservation();
    const router = useRouter();
    const count = computed(() => {
      return unmatchedReadings(observation.readings.sharedState.currentReadings, observation.protocol.sharedState.currentProtocol?._items).length;
    });
    const ambiguous = computed(() => ambiguousReadings(observation.readings.sharedState.currentReadings, observation.protocol.sharedState.currentProtocol?._items).length);
    const show = () => {
      emit('show');
      if (router.currentRoute.value.name !== 'user_observation') {
        void router.push({ name: 'user_observation', query: { unmatched: '1' } });
      }
    };
    return { count, ambiguous, show };
  },
});
</script>
