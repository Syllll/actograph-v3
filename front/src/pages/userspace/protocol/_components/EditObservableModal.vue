<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="'Modifier l\'observable'"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="editObservable" class="q-gutter-md">
        <q-input
          v-model="state.form.name"
          label="Nom de l'observable"
          :rules="[(val: string) => !!val || 'Le nom est obligatoire']"
          outlined
          dense
        />

        <q-input
          v-model.number="state.form.order"
          label="Ordre d'affichage"
          type="number"
          min="0"
          :rules="[
            (val: number) => val !== null && val !== undefined || 'L\'ordre est obligatoire',
            (val: number) => val >= 0 || 'L\'ordre doit être positif'
          ]"
          outlined
          dense
        />

        <q-input
          v-model="state.form.description"
          label="Description (optionnelle)"
          type="textarea"
          outlined
          dense
        />
      </q-form>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        label="Annuler"
      />
      <DSubmitBtn
        @click="editObservable"
        label="Enregistrer"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, PropType } from 'vue';
import { useQuasar } from 'quasar';
import {
  ProtocolItem,
  ProtocolItemTypeEnum,
} from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

import {
  DDialog,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'EditObservableModal',
  components: {
    DDialog,
    DCancelBtn,
    DSubmitBtn,
  },

  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    observable: {
      type: Object as PropType<ProtocolItem | null>,
      default: null,
    },
    categoryId: {
      type: String,
      default: '',
    }
  },

  emits: ['update:modelValue', 'observable-updated'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
      form: {
        id: '',
        name: '',
        description: '',
        order: 0,
      },
    });

    // Update form when observable prop changes
    watch(
      () => props.observable,
      (observable) => {
        if (observable) {
          // The observable now has the order property explicitly added in the parent component
          state.form = {
            id: observable.id,
            name: observable.name,
            description: observable.description || '',
            order: (observable as any).order || 0, // Cast to any to access the dynamically added property
          };
        }
      },
      { immediate: true }
    );

    // Reset error when modal opens
    watch(
      () => props.modelValue,
      (isOpen) => {
        if (isOpen) {
          state.error = '';
        }
      }
    );

    const editObservable = async () => {
      if (!state.form.name) {
        state.error = "Le nom de l'observable est obligatoire";
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error =
          "Impossible de modifier l'observable : identifiant de protocole manquant";
        return;
      }

      if (!state.form.id) {
        state.error =
          "Impossible de modifier l'observable : identifiant d'observable manquant";
        return;
      }

      if (!props.categoryId) {
        state.error =
          "Impossible de modifier l'observable : identifiant de catégorie manquant";
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.editProtocolItem !== 'function'
      ) {
        state.error = 'Service de protocole non disponible';
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        await protocol.methods.editProtocolItem({
          id: state.form.id,
          protocolId: observation.protocol.sharedState.currentProtocol.id,
          name: state.form.name,
          description: state.form.description || undefined,
          order: state.form.order,
          type: ProtocolItemTypeEnum.Observable,
        });

        $q.notify({
          type: 'positive',
          message: 'Observable modifié avec succès',
        });

        emit('observable-updated', props.categoryId);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to edit observable:', error);
        state.error = "Échec de la modification de l'observable";
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      editObservable,
    };
  },
});
</script> 