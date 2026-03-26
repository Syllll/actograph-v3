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
     * 1. Vérifie que le mode peut être changé (observation non démarrée)
     * 2. Demande confirmation à l'utilisateur (action irréversible)
     * 3. Met à jour l'observation via l'API
     * 4. Émet un événement pour notifier les composants parents
     * 
     * IMPORTANT : Le mode est figé une fois choisi. Il ne peut être changé que
     * si l'observation n'a pas encore été démarrée (pas de reading de type START).
     * 
     * @param newMode - Le nouveau mode à activer ('calendar' ou 'chronometer')
     */
    const handleModeChange = async (newMode: 'calendar' | 'chronometer') => {
      // Ne pas changer si déjà dans ce mode
      if (props.currentMode === newMode) {
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
        title: t('observation.switchToModeTitle', { mode: modeLabel }),
        message: t('observation.switchToModeMessage', { mode: modeLabel }),
        cancel: t('dialogs.cancel'),
        ok: {
          label: t('observation.switchModeConfirm'),
          color: 'primary',
        },
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

