<template>
  <div class="calendar-toolbar row items-center q-pa-sm q-gutter-md">
    <q-btn
      v-if="showAttachVideo"
      flat
      outline
      color="primary"
      icon="videocam"
      :label="$t('observation.attachVideo')"
      :title="attachVideoTitle"
      size="sm"
      :disable="attachVideoBlocked"
      @click="handleAttachVideo"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'CalendarToolbar',

  props: {
    attachInProgress: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:attachInProgress'],

  setup(props, { emit }) {
    const observation = useObservation();
    const $q = useQuasar();
    const { t } = useI18n();

    const showAttachVideo = computed(() => {
      return observation.isChronometerMode.value
        && !observation.sharedState.currentObservation?.videoPath;
    });

    const attachVideoBlocked = computed(() => {
      return props.attachInProgress
        || observation.sharedState.isPlaying
        || observation.sharedState.elapsedTime > 0;
    });

    const attachVideoTitle = computed(() => {
      return attachVideoBlocked.value
        ? t('observation.attachVideoBlockedTooltip')
        : t('observation.attachVideoTooltip');
    });

    const setAttachInProgress = (value: boolean) => {
      emit('update:attachInProgress', value);
    };

    const handleAttachVideo = async () => {
      if (attachVideoBlocked.value) {
        $q.notify({
          type: 'warning',
          message: t('observation.attachVideoBlocked'),
          caption: t('observation.attachVideoBlockedCaption'),
        });
        return;
      }

      if (!window.api || !window.api.showOpenDialog) {
        $q.notify({
          type: 'negative',
          message: t('dialogs.createObservation.electronUnavailable'),
        });
        return;
      }

      try {
        const dialogResult = await window.api.showOpenDialog({
          filters: [
            { name: t('dialogs.createObservation.videoFiles'), extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'] },
            { name: t('dialogs.createObservation.allFiles'), extensions: ['*'] },
          ],
        });

        if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
          return;
        }

        if (
          observation.sharedState.isPlaying
          || observation.sharedState.elapsedTime > 0
        ) {
          $q.notify({
            type: 'warning',
            message: t('observation.attachVideoBlocked'),
            caption: t('observation.attachVideoBlockedCaption'),
          });
          return;
        }

        const filePath = dialogResult.filePaths[0];
        const observationId = observation.sharedState.currentObservation?.id;
        if (!observationId) return;

        setAttachInProgress(true);
        try {
          await observation.methods.updateObservation(observationId, {
            videoPath: filePath,
          });
        } finally {
          setAttachInProgress(false);
        }
      } catch (error: any) {
        setAttachInProgress(false);
        $q.notify({
          type: 'negative',
          message: t('dialogs.createObservation.videoSelectError'),
          caption: error.message,
        });
      }
    };

    return {
      showAttachVideo,
      attachVideoBlocked,
      attachVideoTitle,
      handleAttachVideo,
    };
  },
});
</script>

<style scoped>
.calendar-toolbar {
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid var(--separator);
  flex-shrink: 0;
  min-height: 0;
  height: auto;
}

.body--dark .calendar-toolbar {
  background-color: rgba(30, 30, 30, 0.95);
}
</style>
