<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="handleDialogHide">
    <DDialogCard
      :title="$t('dialogs.createObservation.title')"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('dialogs.createObservation.submit')"
      :submitDisable="!methods.isValid || state.creating"
      :submitLoading="state.creating"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <div class="column q-gutter-md">
        <q-input
          v-model="state.name"
          :placeholder="$t('dialogs.createObservation.namePlaceholder')"
          outlined
          dense
          :rules="[(val) => (val && val.trim().length > 0) || $t('dialogs.createObservation.nameRequired')]"
        />
        <q-input
          v-model="state.description"
          :placeholder="$t('dialogs.createObservation.descriptionPlaceholder')"
          outlined
          dense
          type="textarea"
          :rows="4"
        />

        <q-select
          v-model="state.observationType"
          :options="observationTypeOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          :label="$t('dialogs.createObservation.observationTypeLabel')"
          :hint="$t('dialogs.createObservation.observationTypeHint')"
          :rules="[(val) => (val !== null && val !== undefined) || $t('dialogs.createObservation.observationTypeRequired')]"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>{{ scope.opt.description }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div v-if="state.observationType === 'video'" class="column q-gutter-sm">
          <q-btn
            v-if="!state.videoPath"
            color="primary"
            icon="videocam"
            :label="$t('dialogs.createObservation.selectVideo')"
            outline
            @click="methods.selectVideoFile"
          />
          <div v-else class="row items-center q-gutter-sm">
            <q-icon name="check_circle" color="positive" size="sm" />
            <span class="text-caption text-neutral-high">{{ methods.getVideoFileName(state.videoPath) }}</span>
            <q-btn
              flat
              dense
              round
              icon="close"
              size="sm"
              @click="state.videoPath = null"
            />
          </div>
        </div>

        <q-separator />
        <div class="column q-gutter-sm">
          <q-toggle
            v-model="state.copyProtocol"
            :label="$t('dialogs.createObservation.copyProtocol')"
            color="primary"
          />
          <q-select
            v-if="state.copyProtocol"
            v-model="state.sourceObservationId"
            :options="observationOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            :placeholder="$t('dialogs.createObservation.sourcePlaceholder')"
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
            :hint="$t('dialogs.createObservation.sourceHint')"
          />
        </div>

        <q-select
          v-if="state.observationType === 'direct'"
          v-model="state.mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          :label="$t('dialogs.createObservation.modeLabel')"
          :hint="$t('dialogs.createObservation.modeHint')"
          :rules="[(val) => (val !== null && val !== undefined) || $t('dialogs.createObservation.modeRequired')]"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>{{ scope.opt.description }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  nextTick,
  ref,
  onMounted,
  onUnmounted,
  computed,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { DDialogCard } from '@lib-improba/components';
import { ObservationModeEnum } from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';

export default defineComponent({
  name: 'CreateObservationDialog',
  emits: [...useDialogPluginComponent.emits],
  components: { DDialogCard },
  setup() {
    const $q = useQuasar();
    const { t, locale } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const isMounted = ref(true);

    onMounted(async () => {
      isMounted.value = true;
      state.observationsLoading = true;
      try {
        const observations = await observationService.findAllForCurrentUser();
        state.observations = observations.map((obs) => ({
          id: obs.id,
          name: obs.name || t('chronicle.fallbackName', { id: obs.id }),
        }));
      } catch (error) {
        console.error('CreateObservationDialog: failed to load observations', error);
      } finally {
        state.observationsLoading = false;
      }
    });

    onUnmounted(() => {
      isMounted.value = false;
    });

    const state = reactive({
      name: '',
      description: '',
      observationType: 'direct' as 'video' | 'direct',
      videoPath: null as string | null,
      mode: ObservationModeEnum.Calendar as ObservationModeEnum,
      copyProtocol: false,
      sourceObservationId: null as number | null,
      observations: [] as { id: number; name: string }[],
      observationsLoading: false,
      creating: false,
    });

    const observationOptions = computed(() =>
      state.observations.map((obs) => ({
        label: obs.name,
        value: obs.id,
      }))
    );

    const observationTypeOptions = computed(() => {
      void locale.value;
      return [
        { label: t('dialogs.createObservation.typeDirect'), value: 'direct', description: t('dialogs.createObservation.typeDirectDesc') },
        { label: t('dialogs.createObservation.typeVideo'), value: 'video', description: t('dialogs.createObservation.typeVideoDesc') },
      ];
    });

    const modeOptions = computed(() => {
      void locale.value;
      return [
        { label: t('dialogs.createObservation.modeCalendar'), value: ObservationModeEnum.Calendar, description: t('dialogs.createObservation.modeCalendarDesc') },
        { label: t('dialogs.createObservation.modeChronometer'), value: ObservationModeEnum.Chronometer, description: t('dialogs.createObservation.modeChronometerDesc') },
      ];
    });

    const handleDialogHide = async () => {
      if (!isMounted.value) return;
      try {
        await nextTick();
        if (!isMounted.value) return;
        if (onDialogHide) onDialogHide();
      } catch (error) {
        console.debug('Dialog hide error (ignored):', error);
      }
    };

    const methods = {
      get isValid(): boolean {
        if (!state.name || state.name.trim().length === 0) return false;
        if (state.observationType === 'video' && !state.videoPath) return false;
        if (state.observationType === 'direct' && !state.mode) return false;
        if (state.copyProtocol && !state.sourceObservationId) return false;
        return true;
      },

      selectVideoFile: async () => {
        if (!window.api || !window.api.showOpenDialog) {
          $q.notify({ type: 'negative', message: t('dialogs.createObservation.electronUnavailable') });
          return;
        }
        try {
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: t('dialogs.createObservation.videoFiles'), extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'] },
              { name: t('dialogs.createObservation.allFiles'), extensions: ['*'] },
            ],
          });
          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) return;
          state.videoPath = dialogResult.filePaths[0];
        } catch (error: any) {
          $q.notify({ type: 'negative', message: t('dialogs.createObservation.videoSelectError'), caption: error.message });
        }
      },

      getVideoFileName: (path: string | null): string => {
        if (!path) return '';
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || path;
      },

      onOKClick: () => {
        if (!methods.isValid || state.creating) return;
        const finalMode = state.observationType === 'video'
          ? ObservationModeEnum.Chronometer
          : state.mode;

        const dialogResult: any = {
          name: state.name.trim(),
          description: state.description.trim() || undefined,
          mode: finalMode,
        };

        if (state.copyProtocol && state.sourceObservationId) {
          dialogResult.sourceObservationId = state.sourceObservationId;
        }
        if (state.observationType === 'video') {
          if (state.videoPath && typeof state.videoPath === 'string' && state.videoPath.trim() !== '') {
            dialogResult.videoPath = state.videoPath;
          }
        }

        state.creating = true;
        onDialogOK(dialogResult);
      },
    };

    return {
      dialogRef,
      state,
      observationTypeOptions,
      modeOptions,
      observationOptions,
      methods,
      handleDialogHide,
      onOKClick: methods.onOKClick,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>
