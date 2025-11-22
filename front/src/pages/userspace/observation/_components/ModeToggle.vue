<template>
  <q-btn-group class="mode-toggle">
    <q-btn
      :color="currentMode === 'calendar' ? 'primary' : 'grey-5'"
      :outline="currentMode !== 'calendar'"
      icon="event"
      label="Calendrier"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('calendar')"
    >
      <q-tooltip>Passer en mode calendrier</q-tooltip>
    </q-btn>
    <q-btn
      :color="currentMode === 'chronometer' ? 'primary' : 'grey-5'"
      :outline="currentMode !== 'chronometer'"
      icon="timer"
      label="Chronomètre"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('chronometer')"
    >
      <q-tooltip>Passer en mode chronomètre</q-tooltip>
    </q-btn>
  </q-btn-group>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ObservationModeEnum } from '@services/observations/interface';
import { useQuasar } from 'quasar';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'ModeToggle',

  props: {
    currentMode: {
      type: String as () => ObservationModeEnum | null,
      default: null,
      validator: (value: ObservationModeEnum | null) => {
        return value === null || value === ObservationModeEnum.Calendar || value === ObservationModeEnum.Chronometer;
      },
    },
    canChangeMode: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['mode-change'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();

    const handleModeChange = async (newMode: 'calendar' | 'chronometer') => {
      // Don't switch if already in that mode
      if (props.currentMode === newMode) {
        return;
      }

      // Double check that we can change mode
      if (!props.canChangeMode) {
        $q.notify({
          type: 'negative',
          message: 'Impossible de changer de mode',
          caption: 'L\'observation a déjà été démarrée',
        });
        return;
      }

      // Confirm action
      const modeLabel = newMode === 'chronometer' ? 'chronomètre' : 'calendrier';
      const dialog = await createDialog({
        title: `Passer en mode ${modeLabel}`,
        message: `Voulez-vous passer cette observation en mode ${modeLabel} ? Cette action est irréversible.`,
        cancel: 'Annuler',
        ok: {
          label: 'Changer',
          color: 'primary',
        },
        persistent: true,
      });

      if (!dialog) return;

      // Update observation mode
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) {
        $q.notify({
          type: 'negative',
          message: 'Erreur',
          caption: 'Observation introuvable',
        });
        return;
      }

      try {
        await observation.methods.updateObservation(observationId, {
          mode: newMode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar,
        });

        // Emit event for parent components
        emit('mode-change', newMode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar);

        $q.notify({
          type: 'positive',
          message: `Mode ${modeLabel} activé`,
          caption: `L'observation est maintenant en mode ${modeLabel}`,
        });
      } catch (error: any) {
        $q.notify({
          type: 'negative',
          message: 'Erreur lors du changement de mode',
          caption: error.message || 'Une erreur est survenue',
        });
      }
    };

    return {
      handleModeChange,
    };
  },
});
</script>

<style scoped>
.mode-toggle {
  /* Buttons are grouped together, no gap */
}
</style>

