<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.removeCategoryTitle')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <p>
        {{ t('protocolUi.removeCategoryConfirm', { name: category?.name ?? '' }) }}
      </p>
      <p class="text-negative">
        {{ t('protocolUi.removeCategoryWarningLong') }}
      </p>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        :label="t('dialogs.cancel')"
      />
      <DSubmitBtn
        @click="removeCategory"
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
    const { t } = useI18n();
    const observation = useObservation();
    const protocol = observation.protocol;

    const state = reactive({
      loading: false,
      error: '',
    });

    const removeCategory = async () => {
      if (!props.category) {
        state.error = t('protocolUi.categoryNotFound');
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

        const result = await protocol.methods.removeItem(props.category.id);

        $q.notify({
          type: 'positive',
          message: t('protocolUi.categoryRemoved'),
        });

        if (result && result.defaultTemplateCreated) {
          $q.notify({
            type: 'info',
            message: t('protocolUi.defaultTemplateCreated'),
            timeout: 5000,
          });
        }

        emit('category-removed');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to remove category:', error);
        state.error = t('protocolUi.categoryRemoveFailed');
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      removeCategory,
    };
  },
});
</script>
