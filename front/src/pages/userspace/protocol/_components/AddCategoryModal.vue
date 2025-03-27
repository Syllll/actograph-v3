<template>
  <DModal
    :trigger-open="modelValue"
    @update:trigger-open="$emit('update:modelValue', $event)"
    :title="'Ajouter une catégorie'"
    button1Label="components.DModal.cancel"
    button2Label="components.DModal.add"
    @cancelled="$emit('update:modelValue', false)"
    @submitted="addCategory"
    persistent
  >
    <div class="q-pa-md">
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="addCategory" class="q-gutter-md">
        <q-input
          v-model="state.form.name"
          label="Nom de la catégorie"
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

        <q-select
          v-model="state.form.action"
          :options="actionOptions"
          label="Type d'action"
          outlined
          dense
          emit-value
          map-options
        />
      </q-form>
    </div>
  </DModal>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, PropType } from 'vue';
import { useQuasar } from 'quasar';
import {
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
} from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'AddCategoryModal',

  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    defaultOrder: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue', 'category-added'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const actionOptions = [
      { label: 'Continue', value: ProtocolItemActionEnum.Continuous },
      { label: 'Discret', value: ProtocolItemActionEnum.Discrete },
    ];

    const state = reactive({
      loading: false,
      error: '',
      form: {
        name: '',
        description: '',
        order: props.defaultOrder,
        action: ProtocolItemActionEnum.Continuous,
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
            action: ProtocolItemActionEnum.Continuous,
          };
        }
      }
    );

    const addCategory = async () => {
      if (!state.form.name) {
        state.error = 'Le nom de la catégorie est obligatoire';
        return;
      }

      if (!observation.sharedState.currentProtocol?.id) {
        state.error =
          "Impossible d'ajouter une catégorie : identifiant de protocole manquant";
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.addCategory !== 'function'
      ) {
        state.error = 'Service de protocole non disponible';
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        await protocol.methods.addCategory({
          protocolId: observation.sharedState.currentProtocol.id,
          name: state.form.name,
          description: state.form.description || undefined,
          order: state.form.order,
          action: state.form.action,
          type: ProtocolItemTypeEnum.Category,
        });

        $q.notify({
          type: 'positive',
          message: 'Catégorie ajoutée avec succès',
        });

        emit('category-added');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to add category:', error);
        state.error = "Échec de l'ajout de la catégorie";
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      addCategory,
      actionOptions,
    };
  },
});
</script>
