<template>
  <div
    class="protocol-inline-add row q-col-gutter-sm items-center"
    @keydown.esc.stop="onEscape"
  >
    <div :class="mode === 'category' ? 'col-12 col-md-4' : 'col-12 col-md-4'">
      <q-input
        ref="nameInputRef"
        v-model="state.name"
        :label="nameLabel"
        :aria-label="nameLabel"
        outlined
        dense
        :disable="state.submitting"
        @keydown.enter.prevent="onEnter"
      />
    </div>
    <div class="col-12 col-md-4">
      <q-input
        v-model="state.description"
        :label="t('protocolUi.fieldDescriptionOptional')"
        outlined
        dense
        type="textarea"
        autogrow
        :disable="state.submitting"
      />
    </div>
    <div
      v-if="mode === 'category'"
      class="col-12 col-md-3 protocol-inline-add__action"
    >
      <q-btn-toggle
        v-model="state.action"
        :options="actionOptions"
        spread
        no-caps
        unelevated
        toggle-color="accent"
        toggle-text-color="white"
        :color="toggleRestColor"
        :text-color="toggleRestTextColor"
        :disable="state.submitting"
        :aria-label="t('protocolUi.fieldActionType')"
      />
    </div>
    <div class="col-auto protocol-inline-add__submit">
      <q-btn
        round
        unelevated
        dense
        icon="mdi-check"
        color="accent"
        text-color="white"
        :loading="state.submitting"
        :disable="state.submitting"
        :aria-label="t('protocolUi.inlineAddValidate')"
        @click="onEnter"
      >
        <q-tooltip>{{ t('protocolUi.inlineAddValidate') }}</q-tooltip>
      </q-btn>
    </div>
    <div v-if="state.error" class="col-12 text-negative text-caption">
      {{ state.error }}
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  watch,
  ref,
  nextTick,
  PropType,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { QInput, useQuasar } from 'quasar';
import { ProtocolItemActionEnum } from '@services/observations/protocol.service';

export type InlineAddMode = 'category' | 'observable';

export interface ProtocolInlineAddFieldsExpose {
  reset: () => void;
  focusName: () => void | Promise<void>;
  finishCommit: (success: boolean) => void;
}

export default defineComponent({
  name: 'ProtocolInlineAddFields',

  props: {
    mode: {
      type: String as PropType<InlineAddMode>,
      required: true,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['commit', 'cancel'],

  setup(props, { emit, expose }) {
    const { t } = useI18n();
    const $q = useQuasar();
    const nameInputRef = ref<InstanceType<typeof QInput> | null>(null);

    const toggleRestColor = computed(() => ($q.dark.isActive ? 'grey-8' : 'grey-3'));
    const toggleRestTextColor = computed(() =>
      $q.dark.isActive ? 'white' : 'grey-8'
    );

    const state = reactive({
      name: '',
      description: '',
      action: ProtocolItemActionEnum.Continuous,
      error: '',
      submitting: false,
    });

    const actionOptions = computed(() => [
      {
        label: t('protocolUi.actionTypeContinuous'),
        value: ProtocolItemActionEnum.Continuous,
      },
      {
        label: t('protocolUi.actionTypeDiscrete'),
        value: ProtocolItemActionEnum.Discrete,
      },
    ]);

    const nameLabel = computed(() =>
      props.mode === 'category'
        ? t('protocolUi.fieldCategoryName')
        : t('protocolUi.fieldObservableName')
    );

    const reset = () => {
      state.name = '';
      state.description = '';
      state.action = ProtocolItemActionEnum.Continuous;
      state.error = '';
      state.submitting = false;
    };

    const focusName = async () => {
      await nextTick();
      nameInputRef.value?.focus();
    };

    watch(
      () => props.autofocus,
      (shouldFocus) => {
        if (shouldFocus) {
          focusName();
        }
      },
      { immediate: true }
    );

    const onEnter = () => {
      const name = state.name.trim();
      if (!name) {
        state.error =
          props.mode === 'category'
            ? t('protocolUi.errCategoryNameRequired')
            : t('protocolUi.errObservableNameRequired');
        return;
      }
      state.error = '';
      state.submitting = true;
      emit('commit', {
        name,
        description: state.description.trim(),
        action: state.action,
      });
    };

    const onEscape = () => {
      reset();
      emit('cancel');
    };

    const finishCommit = (success: boolean) => {
      state.submitting = false;
      if (success) {
        reset();
        focusName();
      }
    };

    expose({ reset, focusName, finishCommit });

    return {
      t,
      state,
      actionOptions,
      toggleRestColor,
      toggleRestTextColor,
      nameLabel,
      nameInputRef,
      onEnter,
      onEscape,
      reset,
      finishCommit,
    };
  },
});
</script>

<style scoped lang="scss">
.protocol-inline-add {
  max-width: 56rem;
}

.protocol-inline-add__action .q-btn-toggle {
  width: 100%;
  min-height: 40px;
}
</style>
