<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="'Ajouter un observable'"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="addObservable" class="q-gutter-md">
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
        @click="addObservable"
        label="Ajouter"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, PropType, ref } from 'vue';
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
  name: 'AddObservableModal',
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
    category: {
      type: Object as PropType<ProtocolItem | null>,
      default: null,
    },
    defaultOrder: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue', 'observable-added'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
      form: {
        name: '',
        description: '',
        order: props.defaultOrder,
      },
    });

    // Reset form when modal is opened
    watch(
      () => props.modelValue,
      (isOpen) => {
        if (isOpen) {
          state.error = '';
          state.form = {
            name: '',
            description: '',
            order: props.defaultOrder,
          };
        }
      }
    );

    const addObservable = async () => {
      if (!state.form.name) {
        state.error = "Le nom de l'observable est obligatoire";
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error =
          "Impossible d'ajouter un observable : identifiant de protocole manquant";
        return;
      }

      if (!props.category?.id) {
        state.error =
          "Impossible d'ajouter un observable : catégorie parente manquante";
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.addObservable !== 'function'
      ) {
        state.error = 'Service de protocole non disponible';
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        await protocol.methods.addObservable({
          protocolId: observation.protocol.sharedState.currentProtocol.id,
          parentId: props.category.id,
          name: state.form.name,
          description: state.form.description || undefined,
          order: state.form.order,
          type: ProtocolItemTypeEnum.Observable,
        });

        $q.notify({
          type: 'positive',
          message: 'Observable ajouté avec succès',
        });

        // Emit with the category ID so the parent component knows which category to expand
        emit('observable-added', props.category.id);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to add observable:', error);
        state.error = "Échec de l'ajout de l'observable";
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      addObservable,
    };
  },
});
</script>
