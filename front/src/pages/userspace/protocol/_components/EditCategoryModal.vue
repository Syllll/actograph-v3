<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.modalEditCategoryTitle')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="editCategory" class="q-gutter-md">
        <q-input
          v-model="state.form.name"
          :label="t('protocolUi.fieldCategoryName')"
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

        <q-select
          v-model="state.form.action"
          :options="actionOptions"
          :label="t('protocolUi.fieldActionType')"
          outlined
          dense
          emit-value
          map-options
        />
      </q-form>
    </div>
    <template #actions>
      <DCancelBtn
        @click="$emit('update:modelValue', false)"
        :label="t('dialogs.cancel')"
      />
      <DSubmitBtn
        @click="editCategory"
        :label="t('components.DModal.save')"
        :disable="state.loading"
        :loading="state.loading"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, PropType, computed } from 'vue';
import { useQuasar } from 'quasar';
import {
  ProtocolItem,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
} from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';
import { useI18n } from 'vue-i18n';

import {
  DDialog,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'EditCategoryModal',
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
    categoryIndex: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue', 'category-updated'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation();
    const protocol = observation.protocol;

    const actionOptions = computed(() => [
      { label: t('protocolUi.actionTypeContinuous'), value: ProtocolItemActionEnum.Continuous },
      { label: t('protocolUi.actionTypeDiscrete'), value: ProtocolItemActionEnum.Discrete },
    ]);

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
        state.error = t('protocolUi.errCategoryNameRequired');
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error = t('protocolUi.errCannotEditCategoryNoProtocolId');
        return;
      }

      if (!state.form.id) {
        state.error = t('protocolUi.errCannotEditCategoryNoCategoryId');
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
          message: t('protocolUi.categoryEdited'),
        });

        emit('category-updated');
        emit('update:modelValue', false);
      } catch (error: unknown) {
        console.error('Failed to edit category:', error);
        const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
        const apiMessage = err?.response?.data?.message;
        const message = Array.isArray(apiMessage)
          ? apiMessage.join('. ')
          : apiMessage || err?.message || t('protocolUi.errEditCategoryFailed');
        state.error = message;
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      editCategory,
      actionOptions,
    };
  },
});
</script>
