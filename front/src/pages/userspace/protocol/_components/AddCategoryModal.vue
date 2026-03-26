<template>
  <DDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('protocolUi.addCategory')"
  >
    <div>
      <div v-if="state.error" class="text-negative q-mb-md">
        {{ state.error }}
      </div>

      <q-form @submit.prevent="addCategory" class="q-gutter-md">
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
        @click="addCategory"
        :label="t('components.DModal.add')"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import {
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
  name: 'AddCategoryModal',
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
    defaultOrder: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue', 'category-added'],

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
        name: '',
        description: '',
        order: props.defaultOrder,
        action: ProtocolItemActionEnum.Continuous,
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
            action: ProtocolItemActionEnum.Continuous,
          };
        }
      }
    );

    const addCategory = async () => {
      if (!state.form.name) {
        state.error = t('protocolUi.errCategoryNameRequired');
        return;
      }

      if (!observation.protocol.sharedState.currentProtocol?.id) {
        state.error = t('protocolUi.errCannotAddCategoryNoProtocolId');
        return;
      }

      if (
        !protocol ||
        !protocol.methods ||
        typeof protocol.methods.addCategory !== 'function'
      ) {
        state.error = t('protocolUi.serviceUnavailable');
        console.error('Protocol service is not properly initialized');
        return;
      }

      try {
        state.loading = true;
        state.error = '';

        await protocol.methods.addCategory({
          protocolId: observation.protocol.sharedState.currentProtocol.id,
          name: state.form.name,
          description: state.form.description || undefined,
          order: state.form.order,
          action: state.form.action,
          type: ProtocolItemTypeEnum.Category,
        });

        $q.notify({
          type: 'positive',
          message: t('protocolUi.categoryAdded'),
        });

        emit('category-added');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to add category:', error);
        state.error = t('protocolUi.errAddCategoryFailed');
      } finally {
        state.loading = false;
      }
    };

    return {
      t,
      state,
      addCategory,
      actionOptions,
    };
  },
});
</script>
