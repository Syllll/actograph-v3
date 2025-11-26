<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="'Supprimer l\'observable'"
  >
    <div>
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
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        label="Annuler"
      />
      <DSubmitBtn
        @click="removeObservable"
        label="Supprimer"
        color="negative"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { ProtocolItem, protocolService } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

import {
  DDialog,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'RemoveObservableModal',
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

        const result = await protocol.methods.removeItem(props.observable.id);

        $q.notify({
          type: 'positive',
          message: 'Observable supprimé avec succès',
        });

        // If a default template was created, show an informative message
        if (result && result.defaultTemplateCreated) {
          $q.notify({
            type: 'info',
            message: 'Un template par défaut a été créé automatiquement (1 catégorie + 1 observable)',
            timeout: 5000,
          });
        }

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