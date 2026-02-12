<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="'Déplacer vers une autre catégorie'"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="moveObservable" class="q-gutter-md">
        <p v-if="categoryOptions.length === 0" class="text-body2">
          Aucune autre catégorie disponible pour le déplacement.
        </p>
        <q-select
          v-else
          v-model="state.selectedCategoryId"
          :options="categoryOptions"
          label="Catégorie de destination"
          outlined
          dense
          emit-value
          map-options
          :rules="[(val: string) => !!val || 'Sélectionnez une catégorie']"
        />
      </q-form>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        label="Annuler"
      />
      <DSubmitBtn
        @click="moveObservable"
        label="Déplacer"
        :disable="state.loading || !state.selectedCategoryId || categoryOptions.length === 0"
        :loading="state.loading"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';
import { useQuasar } from 'quasar';
import {
  ProtocolItem,
  ProtocolItemTypeEnum,
} from '@services/observations/protocol.service';
import { protocolService } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';

import {
  DDialog,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'MoveObservableModal',
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
    sourceCategoryId: {
      type: String,
      default: '',
    },
    categories: {
      type: Array as PropType<ProtocolItem[]>,
      default: () => [],
    },
  },

  emits: ['update:modelValue', 'observable-moved'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;

    const categoryOptions = computed(() => {
      return props.categories
        .filter(
          (c) =>
            c.type === ProtocolItemTypeEnum.Category &&
            c.id !== props.sourceCategoryId
        )
        .map((c) => ({ label: c.name, value: c.id }));
    });

    const state = reactive({
      loading: false,
      error: '',
      selectedCategoryId: null as string | null,
    });

    watch(
      () => props.modelValue,
      (isOpen) => {
        if (isOpen) {
          state.error = '';
          state.selectedCategoryId = null;
        }
      }
    );

    const moveObservable = async () => {
      if (!state.selectedCategoryId) {
        state.error = 'Sélectionnez une catégorie de destination';
        return;
      }

      if (!props.observable?.id) {
        state.error = 'Observable invalide ou identifiant manquant';
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error =
          'Impossible de déplacer : identifiant de protocole manquant';
        return;
      }

      if (!protocol || !protocol.methods) {
        state.error = 'Service de protocole non disponible';
        return;
      }

      const currentObservation = observation.sharedState.currentObservation;
      if (!currentObservation) {
        state.error = 'Aucune observation chargée';
        return;
      }

      const protocolId = observation.protocol.sharedState.currentProtocol.id;

      try {
        state.loading = true;
        state.error = '';

        await protocolService.deleteItem(props.observable.id, protocolId);

        const targetCategory = props.categories.find(
          (c) => c.id === state.selectedCategoryId
        );
        const targetOrder = (targetCategory?.children?.length ?? 0);

        await protocolService.addObservable({
          protocolId,
          parentId: state.selectedCategoryId,
          name: props.observable.name,
          description: props.observable.description,
          order: targetOrder,
        });

        await protocol.methods.loadProtocol(currentObservation);

        $q.notify({
          type: 'positive',
          message: 'Observable déplacé avec succès',
        });

        emit('observable-moved', state.selectedCategoryId);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to move observable:', error);
        state.error = "Échec du déplacement de l'observable";
      } finally {
        state.loading = false;
      }
    };

    return {
      state,
      moveObservable,
      categoryOptions,
    };
  },
});
</script>
