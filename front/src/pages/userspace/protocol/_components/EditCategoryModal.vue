<template>
  <DModal
    :trigger-open="modelValue"
    @update:trigger-open="$emit('update:modelValue', $event)"
    :title="'Modifier la catégorie'"
    button1Label="components.DModal.cancel"
    button2Label="components.DModal.save"
    @cancelled="$emit('update:modelValue', false)"
    @submitted="editCategory"
    persistent
  >
    <div class="q-pa-md">
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="editCategory" class="q-gutter-md">
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
  ProtocolItem,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
} from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'EditCategoryModal',

  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    category: {
      type: Object as PropType<ProtocolItem | null>,
      default: null,
    },
    categoryIndex: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue', 'category-updated'],

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
        id: '',
        name: '',
        description: '',
        order: 0,
        action: ProtocolItemActionEnum.Continuous,
      },
    });

    // Update form when category prop changes
    watch(
      () => props.category,
      (category) => {
        if (category) {
          state.form = {
            id: category.id,
            name: category.name,
            description: category.description || '',
            order: props.categoryIndex,
            action: category.action || ProtocolItemActionEnum.Continuous,
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

    const editCategory = async () => {
      if (!state.form.name) {
        state.error = 'Le nom de la catégorie est obligatoire';
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error =
          'Impossible de modifier la catégorie : identifiant de protocole manquant';
        return;
      }

      if (!state.form.id) {
        state.error =
          'Impossible de modifier la catégorie : identifiant de catégorie manquant';
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
          action: state.form.action,
          type: ProtocolItemTypeEnum.Category,
        });

        $q.notify({
          type: 'positive',
          message: 'Catégorie modifiée avec succès',
        });

        emit('category-updated');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to edit category:', error);
        state.error = 'Échec de la modification de la catégorie';
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      editCategory,
      actionOptions,
    };
  },
});
</script>
