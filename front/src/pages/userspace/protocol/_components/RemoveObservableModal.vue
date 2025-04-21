<template>
  <DModal
    :trigger-open="modelValue"
    @update:trigger-open="$emit('update:modelValue', $event)"
    :title="'Supprimer l\'observable'"
    button1Label="components.DModal.cancel"
    button2Label="components.DModal.delete"
    @cancelled="$emit('update:modelValue', false)"
    @submitted="removeObservable"
    persistent
  >
    <div class="q-pa-md">
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <p>
        Êtes-vous sûr de vouloir supprimer l'observable "{{ observable?.name }}" ?
      </p>
      <p class="text-negative">
        Attention : Cette action est irréversible.
      </p>
    </div>
  </DModal>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { ProtocolItem, protocolService } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'RemoveObservableModal',

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

  emits: ['update:modelValue', 'observable-removed'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
    });

    const removeObservable = async () => {
      if (!props.observable || !props.observable.id) {
        state.error = 'Observable invalide ou identifiant manquant';
        return;
      }

      const protocolId = observation.protocol.sharedState.currentProtocol?.id;
      if (!protocolId) {
        state.error =
          "Impossible de supprimer l'observable : identifiant de protocole manquant";
        return;
      }

      if (!props.categoryId) {
        state.error =
          "Impossible de supprimer l'observable : identifiant de catégorie manquant";
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

        await protocol.methods.removeItem(props.observable.id);

        $q.notify({
          type: 'positive',
          message: 'Observable supprimé avec succès',
        });

        emit('observable-removed', props.categoryId);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to remove observable:', error);
        state.error = "Échec de la suppression de l'observable";
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      removeObservable,
    };
  },
});
</script> 