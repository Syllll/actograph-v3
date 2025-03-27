<template>
  <DModal
    :trigger-open="modelValue"
    @update:trigger-open="$emit('update:modelValue', $event)"
    :title="'Supprimer la catégorie'"
    button1Label="components.DModal.cancel"
    button2Label="components.DModal.delete"
    @cancelled="$emit('update:modelValue', false)"
    @submitted="removeCategory"
    persistent
  >
    <div class="q-pa-md">
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
  </DModal>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { ProtocolItem } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'RemoveCategoryModal',

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
        await protocol.methods.removeItem(props.category.id);

        $q.notify({
          type: 'positive',
          message: 'Catégorie supprimée avec succès',
        });

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
