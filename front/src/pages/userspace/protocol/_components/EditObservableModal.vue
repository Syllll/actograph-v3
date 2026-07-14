<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.modalEditObservableTitle')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="editObservable" class="q-gutter-md">
        <q-input
          v-model="state.form.name"
          :label="t('protocolUi.fieldObservableName')"
          :rules="[(val: string) => !!val || t('protocolUi.formNameRequired')]"
          outlined
          dense
        />

        <q-input
          v-model.number="state.form.order"
          :label="t('protocolUi.fieldDisplayOrder')"
          type="number"
          min="0"
          :rules="[
            (val: number) => val !== null && val !== undefined || t('protocolUi.formOrderRequired'),
            (val: number) => val >= 0 || t('protocolUi.formOrderNonNegative')
          ]"
          outlined
          dense
        />

        <q-input
          v-model="state.form.description"
          :label="t('protocolUi.fieldDescriptionOptional')"
          type="textarea"
          outlined
          dense
        />
      </q-form>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        :label="t('dialogs.cancel')"
      />
      <DSubmitBtn
        @click="editObservable"
        :label="t('components.DModal.save')"
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
  isObservableNameInUse,
} from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';
import { useI18n } from 'vue-i18n';

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
    const { t } = useI18n();
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

    watch(
      () => props.observable,
      (observable) => {
        if (observable) {
          state.form = {
            id: observable.id,
            name: observable.name,
            description: observable.description || '',
            order: (observable as ProtocolItem & { order?: number }).order || 0,
          };
        }
      },
      { immediate: true }
    );

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
        state.error = t('protocolUi.errObservableNameRequired');
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error = t('protocolUi.errCannotEditObservableNoProtocolId');
        return;
      }

      if (!state.form.id) {
        state.error = t('protocolUi.errCannotEditObservableNoObservableId');
        return;
      }

      if (!props.categoryId) {
        state.error = t('protocolUi.errCannotEditObservableNoCategoryId');
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.editProtocolItem !== 'function'
      ) {
        state.error = t('protocolUi.serviceUnavailable');
        console.error('Protocol service is not properly initialized');
        return;
      }

      // Interdit de renommer vers un nom déjà porté par un AUTRE observable
      // du protocole (les relevés référencent un observable par son nom, pas
      // par son id : un doublon rendrait impossible de savoir à qui
      // appartient un relevé historique).
      if (
        isObservableNameInUse(
          observation.protocol.sharedState.currentProtocol._items,
          state.form.name,
          state.form.id
        )
      ) {
        state.error = t('protocolUi.errObservableNameAlreadyUsed', {
          name: state.form.name.trim(),
        });
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        const previousName = props.observable?.name || '';
        // Filet de sécurité pour les protocoles créés avant l'ajout de la
        // contrainte d'unicité ci-dessus : si l'ancien nom était déjà partagé
        // par un autre observable (legacy), on ne sait pas sans risque à qui
        // rattacher chaque relevé historique -> pas de cascade-rename.
        const previousNameIsAmbiguous = isObservableNameInUse(
          observation.protocol.sharedState.currentProtocol._items,
          previousName,
          state.form.id
        );

        await protocol.methods.editProtocolItem({
          id: state.form.id,
          protocolId: observation.protocol.sharedState.currentProtocol.id,
          name: state.form.name,
          description: state.form.description || undefined,
          order: state.form.order,
          type: ProtocolItemTypeEnum.Observable,
        });

        // Répercute le renommage sur les relevés déjà enregistrés (onglet
        // Observations), sinon ils continuent de référencer l'ancien nom.
        // Ignoré si l'ancien nom était ambigu (partagé par un autre observable
        // encore présent dans le protocole) : impossible de savoir sans risque
        // quels relevés historiques appartiennent à l'un ou à l'autre.
        if (previousName && previousName !== state.form.name && !previousNameIsAmbiguous) {
          observation.readings.methods.renameObservableReadings(
            previousName,
            state.form.name
          );
        }

        $q.notify({
          type: 'positive',
          message: t('protocolUi.observableEdited'),
        });

        emit('observable-updated', props.categoryId);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to edit observable:', error);
        state.error = t('protocolUi.errEditObservableFailed');
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      editObservable,
    };
  },
});
</script>
