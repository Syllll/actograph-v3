<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.removeObservableTitle')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <p>
        {{ t('protocolUi.removeObservableConfirm', { name: observable?.name ?? '' }) }}
      </p>
      <p class="text-negative">
        {{ t('protocolUi.removeIrreversibleShort') }}
      </p>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        :label="t('dialogs.cancel')"
      />
      <DSubmitBtn
        @click="removeObservable"
        :label="t('components.DModal.delete')"
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
import { useI18n } from 'vue-i18n';

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
    const { t } = useI18n();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
    });

    const removeObservable = async () => {
      if (!props.observable || !props.observable.id) {
        state.error = t('protocolUi.invalidObservable');
        return;
      }

      const protocolId = observation.protocol.sharedState.currentProtocol?.id;
      if (!protocolId) {
        state.error = t('protocolUi.errCannotRemoveObservableNoProtocolId');
        return;
      }

      if (!props.categoryId) {
        state.error = t('protocolUi.errCannotRemoveObservableNoCategoryId');
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.removeItem !== 'function'
      ) {
        state.error = t('protocolUi.serviceUnavailable');
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        const result = await protocol.methods.removeItem(props.observable.id);

        $q.notify({
          type: 'positive',
          message: t('protocolUi.observableRemoved'),
        });

        if (result && result.defaultTemplateCreated) {
          $q.notify({
            type: 'info',
            message: t('protocolUi.defaultTemplateCreated'),
            timeout: 5000,
          });
        }

        emit('observable-removed', props.categoryId);
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to remove observable:', error);
        state.error = t('protocolUi.errRemoveObservableFailed');
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      removeObservable,
    };
  },
});
</script>
