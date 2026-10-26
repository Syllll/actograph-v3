<template>
  <q-btn
    flat round dense size="sm" icon="more_vert"
    :aria-label="$t('chronicleActions.menuLabel', { name: observation.name })"
    :loading="actions.deletingObservationIds.has(observation.id)"
    :disable="actions.deletingObservationIds.size > 0"
    @click.stop
    @keydown.enter.stop
    @keydown.space.stop
  >
    <q-menu @click.stop>
      <q-list dense>
        <q-item clickable v-close-popup @click.stop="actions.deleteObservation(observation)">
          <q-item-section avatar><q-icon name="delete_outline" color="negative" /></q-item-section>
          <q-item-section>{{ $t('chronicleActions.deleteMenu') }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { IObservation } from '@services/observations/interface';
import { useChronicleActions } from 'src/composables/use-chronicle-actions';

export default defineComponent({
  name: 'ChronicleActionsMenu',
  props: {
    observation: { type: Object as PropType<Pick<IObservation, 'id' | 'name'>>, required: true },
  },
  setup() {
    return { actions: useChronicleActions() };
  },
});
</script>
