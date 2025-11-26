<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="'Supprimer la catégorie'"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <p>
        Êtes-vous sûr de vouloir supprimer la catégorie "{{ category?.name }}" ?
      </p>
      <p class="text-negative">
        Attention : Cette action est irréversible et supprimera également tous
        les observables associés à cette catégorie.
      </p>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        label="Annuler"
      />
      <DSubmitBtn
        @click="removeCategory"
        label="Supprimer"
        color="negative"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { ProtocolItem } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

import {
  DDialog,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'RemoveCategoryModal',
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
  },

  emits: ['update:modelValue', 'category-removed'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
    });

    const removeCategory = async () => {
      if (!props.category) {
        state.error = 'Catégorie introuvable';
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.removeItem !== 'function'
      ) {
        state.error = 'Service de protocole non disponible';
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        // Use the protocol composable directly
        const result = await protocol.methods.removeItem(props.category.id);

        $q.notify({
          type: 'positive',
          message: 'Catégorie supprimée avec succès',
        });

        // If a default template was created, show an informative message
        if (result && result.defaultTemplateCreated) {
          $q.notify({
            type: 'info',
            message: 'Un template par défaut a été créé automatiquement (1 catégorie + 1 observable)',
            timeout: 5000,
          });
        }

        emit('category-removed');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to remove category:', error);
        state.error = 'Échec de la suppression de la catégorie';
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      removeCategory,
    };
  },
});
</script>
