<template>
  <q-btn-group class="mode-toggle" flat>
    <q-btn
      :color="currentMode === 'calendar' ? 'accent' : 'grey-7'"
      flat
      icon="event"
      :label="$t('observationsList.modeCalendar')"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('calendar')"
    >
      <q-tooltip>{{ $t('observation.tooltipSwitchToCalendar') }}</q-tooltip>
    </q-btn>
    <q-btn
      :color="currentMode === 'chronometer' ? 'accent' : 'grey-7'"
      flat
      icon="timer"
      :label="$t('observationsList.modeChronometer')"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('chronometer')"
    >
      <q-tooltip>{{ $t('observation.tooltipSwitchToChronometer') }}</q-tooltip>
    </q-btn>
  </q-btn-group>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ObservationModeEnum } from '@services/observations/interface';
import { useQuasar } from 'quasar';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useObservation } from 'src/composables/use-observation';
import { useI18n } from 'vue-i18n';
import SwitchModeDialog from './SwitchModeDialog.vue';

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
    const { t } = useI18n();
    const observation = useObservation();

    /**
     * Gère le changement de mode entre Calendrier et Chronomètre
     * 
     * Cette fonction :
     * 1. Checks that mode can still change (no START reading, no attached video)
     * 2. Asks for confirmation
     * 3. Updates the observation via the API
     * 4. Emits an event for parent components
     *
     * Mode is frozen after the first START reading, or once a video is attached.
     * 
     * @param newMode - Le nouveau mode à activer ('calendar' ou 'chronometer')
     */
    const handleModeChange = async (newMode: 'calendar' | 'chronometer') => {
      // Ne pas changer si déjà dans ce mode
      if (props.currentMode === newMode) {
        return;
      }

      if (observation.sharedState.currentObservation?.videoPath) {
        $q.notify({
          type: 'negative',
          message: t('observation.modeChangeImpossible'),
        });
        return;
      }

      // Vérifier s'il y a des relevés
      const hasReadings = observation.readings.sharedState.currentReadings.length > 0;
      if (hasReadings) {
        $q.notify({
          type: 'negative',
          message: t('observation.modeChangeImpossible'),
          caption: t('observation.modeSwitchBlockedReadings'),
        });
        return;
      }

      if (!props.canChangeMode) {
        $q.notify({
          type: 'negative',
          message: t('observation.modeChangeImpossible'),
          caption: t('observation.modeSwitchBlockedStarted'),
        });
        return;
      }

      const modeLabel =
        newMode === 'chronometer'
          ? t('observation.modeLabelChronometer')
          : t('observation.modeLabelCalendar');
      const dialog = await createDialog({
        component: SwitchModeDialog,
        componentProps: { modeLabel },
        persistent: true,
      });

      if (!dialog) return;

      // Mettre à jour le mode de l'observation via l'API
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) {
        $q.notify({
          type: 'negative',
          message: t('observation.errorShort'),
          caption: t('observation.observationNotFoundCaption'),
        });
        return;
      }

      try {
        await observation.methods.updateObservation(observationId, {
          mode: newMode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar,
        });

        emit('mode-change', newMode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar);

        $q.notify({
          type: 'positive',
          message: t('observation.modeActivated', { mode: modeLabel }),
          caption: t('observation.modeActivatedCaption', { mode: modeLabel }),
        });
      } catch (error: any) {
        $q.notify({
          type: 'negative',
          message: t('observation.modeChangeError'),
          caption: error.message || t('observation.unknownErrorCaption'),
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

