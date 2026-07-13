<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.modalAddObservableTitle')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="addObservable" class="q-gutter-md">
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
        @click="addObservable"
        :label="t('components.DModal.add')"
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
    const { t } = useI18n();
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
        state.error = t('protocolUi.errObservableNameRequired');
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error = t('protocolUi.errCannotAddObservableNoProtocolId');
        return;
      }

      if (
        isObservableNameInUse(
          observation.protocol.sharedState.currentProtocol._items,
          state.form.name
        )
      ) {
        state.error = t('protocolUi.errObservableNameAlreadyUsed', {
          name: state.form.name.trim(),
        });
        return;
      }

      if (!props.category?.id) {
        state.error = t('protocolUi.errCannotAddObservableNoParent');
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.addObservable !== 'function'
      ) {
        state.error = t('protocolUi.serviceUnavailable');
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
          message: t('protocolUi.observableAdded'),
        });

        emit('observable-added', props.category.id);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to add observable:', error);
        state.error = t('protocolUi.errAddObservableFailed');
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      addObservable,
    };
  },
});
</script>
