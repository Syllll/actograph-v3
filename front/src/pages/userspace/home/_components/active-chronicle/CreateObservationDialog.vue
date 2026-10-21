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
        <div class="column q-gutter-xs">
          <div class="text-body2">
            {{ $t('dialogs.createObservation.observationTypeLabel') }}
          </div>
          <div v-if="state.creationEntry !== 'manual'" class="text-caption text-neutral-high">
            {{ $t('dialogs.createObservation.modeHint') }}
          </div>
          <q-select
            v-model="state.creationEntry"
            data-testid="creation-entry"
            :options="creationEntryOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            hide-bottom-space
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

        <div v-if="state.creationEntry === 'manual'" class="column q-gutter-xs">
          <div class="text-body2">{{ $t('dialogs.createObservation.manualTimeBasisLabel') }}</div>
          <q-select
            v-model="state.manualMode"
            data-testid="manual-time-basis"
            :aria-label="$t('dialogs.createObservation.manualTimeBasisLabel')"
            :options="manualTimeBasisOptions"
            emit-value
            map-options
            outlined
            dense
            hide-bottom-space
          />
          <div class="text-caption text-neutral-high">{{ $t('dialogs.createObservation.manualTimeBasisHint') }}</div>
        </div>

        <div v-if="state.creationEntry === 'video'" class="column q-gutter-sm">
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

        <div class="column q-gutter-xs">
          <div class="text-body2">
            {{ $t('dialogs.createObservation.namePlaceholder') }}
          </div>
          <q-input
            v-model="state.name"
            outlined
            dense
            hide-bottom-space
            :rules="[validateName]"
          />
        </div>
        <div class="column q-gutter-xs">
          <div class="text-body2">
            {{ $t('dialogs.createObservation.descriptionPlaceholder') }}
          </div>
          <q-input
            v-model="state.description"
            outlined
            dense
            type="textarea"
            :rows="4"
            hide-bottom-space
          />
        </div>

        <div class="column q-gutter-xs">
          <div class="text-body2">
            {{ $t(state.creationEntry === 'manual' ? 'dialogs.createObservation.protocolChoiceLabel' : 'dialogs.createObservation.protocolLabel') }}
          </div>
          <div v-if="state.creationEntry !== 'manual' || state.protocolChoice === 'copy'" class="text-caption text-neutral-high">
            {{ $t('dialogs.createObservation.sourceHint') }}
          </div>
          <q-option-group
            v-if="state.creationEntry === 'manual'"
            v-model="state.protocolChoice"
            data-testid="manual-protocol-choice"
            :options="protocolChoiceOptions"
            :aria-label="$t('dialogs.createObservation.protocolChoiceLabel')"
            color="primary"
          />
          <q-select
            v-if="state.creationEntry !== 'manual' || state.protocolChoice === 'copy'"
            v-model="state.sourceObservationId"
            data-testid="protocol-source"
            :aria-label="$t('dialogs.createObservation.protocolSourceLabel')"
            :placeholder="state.creationEntry === 'manual' ? $t('dialogs.createObservation.protocolCopyRequired') : undefined"
            :options="protocolOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            hide-bottom-space
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
          />
          <div
            v-if="!state.observationsLoading && state.observations.length === 0"
            class="text-caption text-grey-7"
          >
            {{ $t('dialogs.createObservation.protocolEmpty') }}
          </div>
        </div>
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
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { DDialogCard } from '@lib-improba/components';
import { ObservationModeEnum } from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';
import { protocolHasAtLeastOneCategory } from '@services/observations/protocol.service';

type CreationEntry = 'direct' | 'chronometer' | 'video' | 'manual';

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

    const state = reactive({
      name: '',
      description: '',
      creationEntry: 'direct' as CreationEntry,
      manualMode: ObservationModeEnum.Calendar,
      protocolChoice: 'new' as 'new' | 'copy',
      videoPath: null as string | null,
      sourceObservationId: null as number | null,
      observations: [] as { id: number; name: string }[],
      observationsLoading: false,
      creating: false,
    });

    onMounted(async () => {
      isMounted.value = true;
      state.observationsLoading = true;
      try {
        const observations = await observationService.findAllForCurrentUser();
        state.observations = observations
          .filter((obs) => protocolHasAtLeastOneCategory(obs.protocol))
          .map((obs) => ({
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

    watch(
      () => state.creationEntry,
      (entry, previous) => {
        if (previous === 'video' && entry !== 'video') {
          state.videoPath = null;
        }
      }
    );

    const protocolOptions = computed(() => {
      void locale.value;
      return [
        ...(state.creationEntry === 'manual' ? [] : [
          { label: t('dialogs.createObservation.protocolNone'), value: null as number | null },
        ]),
        ...state.observations.map((obs) => ({
          label: obs.name,
          value: obs.id,
        })),
      ];
    });

    const manualTimeBasisOptions = computed(() => [
      { label: t('dialogs.createObservation.manualCalendar'), value: ObservationModeEnum.Calendar },
      { label: t('dialogs.createObservation.manualChronometer'), value: ObservationModeEnum.Chronometer },
    ]);

    const protocolChoiceOptions = computed(() => [
      { label: t('dialogs.createObservation.protocolNew'), value: 'new' },
      { label: t('dialogs.createObservation.protocolCopy'), value: 'copy', disable: state.observationsLoading || state.observations.length === 0 },
    ]);

    const creationEntryOptions = computed(() => {
      void locale.value;
      return [
        {
          label: t('dialogs.createObservation.typeManual'),
          value: 'manual' as CreationEntry,
          description: t('dialogs.createObservation.typeManualDesc'),
        },
        {
          label: t('dialogs.createObservation.typeDirect'),
          value: 'direct' as CreationEntry,
          description: t('dialogs.createObservation.typeDirectDesc'),
        },
        {
          label: t('dialogs.createObservation.typeChronometer'),
          value: 'chronometer' as CreationEntry,
          description: t('dialogs.createObservation.typeChronometerDesc'),
        },
        {
          label: t('dialogs.createObservation.typeVideo'),
          value: 'video' as CreationEntry,
          description: t('dialogs.createObservation.typeVideoDesc'),
        },
      ];
    });

    const validateName = (val: string | null | undefined): boolean | string =>
      Boolean(val && val.trim().length > 0) || t('dialogs.createObservation.nameRequired');

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
        if (state.creationEntry === 'video' && !state.videoPath) return false;
        if (state.creationEntry === 'manual' && state.protocolChoice === 'copy'
          && (state.observationsLoading || !state.observations.some((obs) => obs.id === state.sourceObservationId))) return false;
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

        const finalMode =
          state.creationEntry === 'manual'
            ? state.manualMode
            : state.creationEntry === 'direct'
            ? ObservationModeEnum.Calendar
            : ObservationModeEnum.Chronometer;

        const dialogResult: {
          name: string;
          description?: string;
          mode: ObservationModeEnum;
          videoPath?: string;
          sourceObservationId?: number;
          meta?: { entryMode: 'manual' };
        } = {
          name: state.name.trim(),
          description: state.description.trim() || undefined,
          mode: finalMode,
        };

        if (state.creationEntry === 'manual') {
          dialogResult.meta = { entryMode: 'manual' };
        }

        if (state.sourceObservationId !== null
          && (state.creationEntry !== 'manual' || state.protocolChoice === 'copy')) {
          dialogResult.sourceObservationId = state.sourceObservationId;
        }

        if (state.creationEntry === 'video') {
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
      creationEntryOptions,
      manualTimeBasisOptions,
      protocolChoiceOptions,
      protocolOptions,
      methods,
      handleDialogHide,
      onOKClick: methods.onOKClick,
      onCancelClick: onDialogCancel,
      validateName,
    };
  },
});
</script>
