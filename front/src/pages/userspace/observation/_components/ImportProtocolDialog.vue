<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <q-card class="import-protocol-dialog">
      <q-card-section class="q-pb-none">
        <h5 class="import-protocol-dialog__title q-ma-none">
          {{ $t('observation.noProtocolImportTitle') }}
        </h5>
      </q-card-section>
      <q-card-section class="column q-gutter-sm">
        <div class="text-caption text-neutral-high">
          {{ $t('dialogs.createObservation.sourceHint') }}
        </div>
        <q-select
          v-model="state.sourceObservationId"
          :options="protocolOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          hide-bottom-space
          :loading="state.loading"
          :disable="state.loading || state.importing"
          :label="$t('observation.noProtocolImportLabel')"
        />
        <div
          v-if="!state.loading && protocolOptions.length === 0"
          class="text-caption text-grey-7"
        >
          {{ $t('observation.noProtocolImportEmpty') }}
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-gutter-md q-px-md q-pb-md">
        <q-btn
          flat
          unelevated
          no-caps
          rounded
          :label="$t('dialogs.cancel')"
          :disable="state.importing"
          @click="onCancelClick"
        />
        <q-btn
          unelevated
          no-caps
          rounded
          color="accent"
          text-color="white"
          :label="$t('observation.noProtocolImportSubmit')"
          :disable="!canImport"
          :loading="state.importing"
          @click="onImportClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, onMounted } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { observationService } from '@services/observations/index.service';
import { protocolService } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'ImportProtocolDialog',
  emits: [...useDialogPluginComponent.emits],
  props: {
    targetObservationId: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      sourceObservationId: null as number | null,
      observations: [] as { id: number; name: string }[],
      loading: false,
      importing: false,
    });

    onMounted(async () => {
      state.loading = true;
      try {
        const observations = await observationService.findAllForCurrentUser();
        state.observations = observations
          .filter((obs) => obs.id !== props.targetObservationId)
          .map((obs) => ({
            id: obs.id,
            name: obs.name || t('chronicle.fallbackName', { id: obs.id }),
          }));
      } catch (error) {
        console.error('ImportProtocolDialog: failed to load observations', error);
      } finally {
        state.loading = false;
      }
    });

    const protocolOptions = computed(() =>
      state.observations.map((obs) => ({
        label: obs.name,
        value: obs.id,
      })),
    );

    const canImport = computed(
      () =>
        state.sourceObservationId !== null
        && !state.loading
        && !state.importing,
    );

    const onImportClick = async () => {
      if (state.sourceObservationId === null) {
        return;
      }

      state.importing = true;
      try {
        await protocolService.cloneProtocol(
          state.sourceObservationId,
          props.targetObservationId,
        );
        const current = observation.sharedState.currentObservation;
        if (current) {
          await observation.protocol.methods.loadProtocol(current);
        }
        $q.notify({
          type: 'positive',
          message: t('observation.noProtocolImportSuccess'),
        });
        onDialogOK(true);
      } catch (error) {
        console.error('ImportProtocolDialog: clone failed', error);
        $q.notify({
          type: 'negative',
          message: t('observation.noProtocolImportError'),
          caption: error instanceof Error ? error.message : t('common.unknownError'),
        });
      } finally {
        state.importing = false;
      }
    };

    return {
      state,
      protocolOptions,
      canImport,
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      onImportClick,
    };
  },
});
</script>

<style scoped lang="scss">
.import-protocol-dialog {
  min-width: min(400px, calc(100vw - 48px));
  max-width: min(90vw, calc(100vw - 48px));
  border: 1px solid var(--neutral-low);
  border-radius: 12px;
  box-shadow: 0 16px 36px var(--neutral-high-20);
  overflow: hidden;
}

.import-protocol-dialog__title {
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
