<template>
  <q-dialog ref="dialogRef" @hide="handleDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 500px"
      bgColor="background"
      innerHeader
      :title="$t('dialogs.mergeObservation.title')"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <q-select
            v-model="state.sourceObservationId1"
            :options="observationOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            :placeholder="$t('dialogs.mergeObservation.firstPlaceholder')"
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
            :rules="[(val) => (val !== null && val !== undefined) || $t('dialogs.mergeObservation.firstRequired')]"
          />
          <q-select
            v-model="state.sourceObservationId2"
            :options="observationOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            :placeholder="$t('dialogs.mergeObservation.secondPlaceholder')"
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
            :rules="[(val) => (val !== null && val !== undefined) || $t('dialogs.mergeObservation.secondRequired')]"
          />
          <q-input
            v-model="state.name"
            :placeholder="$t('dialogs.mergeObservation.mergedNamePlaceholder')"
            outlined
            dense
            :rules="[(val) => (val && val.trim().length > 0) || $t('dialogs.mergeObservation.nameRequired')]"
          />
          <q-input
            v-model="state.description"
            :placeholder="$t('dialogs.mergeObservation.descriptionPlaceholder')"
            outlined
            dense
            type="textarea"
            :rows="4"
          />
        </div>
      </DCardSection>

      <DCardSection class="q-mt-md">
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn
            @click="onCancelClick"
            :label="$t('dialogs.cancel')"
            :disable="state.merging"
          />
          <DSubmitBtn
            :label="$t('dialogs.mergeObservation.submit')"
            @click="onOKClick"
            :disable="!methods.isValid || state.merging"
            :loading="state.merging"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, nextTick, ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';
import { observationService } from '@services/observations/index.service';

export default defineComponent({
  name: 'MergeObservationsDialog',
  emits: [...useDialogPluginComponent.emits],
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
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
        console.error('Failed to load observations for merge dialog:', error);
        $q.notify({
          type: 'negative',
          message: t('dialogs.mergeObservation.loadError'),
          caption:
            error instanceof Error ? error.message : t('common.unknownError'),
        });
      } finally {
        state.observationsLoading = false;
      }
    });

    onUnmounted(() => {
      isMounted.value = false;
    });

    const state = reactive({
      sourceObservationId1: null as number | null,
      sourceObservationId2: null as number | null,
      name: '',
      description: '',
      observations: [] as { id: number; name: string }[],
      observationsLoading: false,
      merging: false,
    });

    const observationOptions = computed(() =>
      state.observations.map((obs) => ({
        label: obs.name,
        value: obs.id,
      }))
    );

    const handleDialogHide = async () => {
      if (!isMounted.value) {
        return;
      }

      try {
        await nextTick();

        if (!isMounted.value) {
          return;
        }

        if (onDialogHide) {
          onDialogHide();
        }
      } catch (error) {
        console.debug('Dialog hide error (ignored):', error);
      }
    };

    const methods = {
      get isValid(): boolean {
        return (
          !!state.name &&
          state.name.trim().length > 0 &&
          state.sourceObservationId1 !== null &&
          state.sourceObservationId1 !== undefined &&
          state.sourceObservationId2 !== null &&
          state.sourceObservationId2 !== undefined &&
          state.sourceObservationId1 !== state.sourceObservationId2
        );
      },

      onOKClick: async () => {
        if (!methods.isValid || state.merging) return;

        if (state.sourceObservationId1 === state.sourceObservationId2) {
          $q.notify({
            type: 'negative',
            message: t('dialogs.mergeObservation.pickTwoDifferent'),
          });
          return;
        }

        state.merging = true;
        try {
          const mergedObservation = await observationService.merge({
            sourceObservationId1: state.sourceObservationId1!,
            sourceObservationId2: state.sourceObservationId2!,
            name: state.name.trim(),
            description: state.description.trim() || undefined,
          });
          onDialogOK(mergedObservation);
        } catch (error) {
          console.error('MergeObservationsDialog: merge failed', error);
          $q.notify({
            type: 'negative',
            message: t('dialogs.mergeObservation.mergeError'),
            caption:
              error instanceof Error ? error.message : t('common.unknownError'),
          });
        } finally {
          state.merging = false;
        }
      },

      onCancelClick: () => {
        onDialogCancel();
      },
    };

    return {
      dialogRef,
      state,
      observationOptions,
      methods,
      handleDialogHide,
      onOKClick: methods.onOKClick,
      onCancelClick: methods.onCancelClick,
    };
  },
});
</script>
