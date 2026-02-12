<template>
  <q-dialog ref="dialogRef" @hide="handleDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Fusionner deux chroniques"
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
            placeholder="Première chronique"
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
            :rules="[(val) => val !== null && val !== undefined || 'Sélectionnez la première chronique']"
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
            placeholder="Deuxième chronique"
            :loading="state.observationsLoading"
            :disable="state.observationsLoading"
            :rules="[(val) => val !== null && val !== undefined || 'Sélectionnez la deuxième chronique']"
          />
          <q-input
            v-model="state.name"
            placeholder="Nom de la chronique fusionnée"
            outlined
            dense
            :rules="[(val) => (val && val.length > 0) || 'Le nom est requis']"
          />
          <q-input
            v-model="state.description"
            placeholder="Description (optionnel)"
            outlined
            dense
            type="textarea"
            :rows="4"
          />
        </div>
      </DCardSection>

      <DCardSection class="q-mt-md">
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" label="Annuler" :disable="state.merging" />
          <DSubmitBtn
            label="Fusionner"
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
          name: obs.name || `Chronique ${obs.id}`,
        }));
      } catch (error) {
        console.error('Erreur lors du chargement des observations:', error);
        $q.notify({
          type: 'negative',
          message: 'Impossible de charger les chroniques',
          caption: error instanceof Error ? error.message : 'Erreur inconnue',
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
            message: 'Veuillez sélectionner deux chroniques différentes',
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
          console.error('Erreur lors de la fusion:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la fusion des chroniques',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
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
