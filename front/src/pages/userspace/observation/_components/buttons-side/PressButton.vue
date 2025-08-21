<template>
  <q-btn
    class="press-button"
    :class="{ 'disabled-button': disabled }"
    :label="observable.name"
    color="neutral"
    rounded
    no-caps
    dense
    :disable="disabled"
    @click="methods.handleClick()"
  >
    <q-tooltip v-if="observable.description">
      {{ observable.description }}
    </q-tooltip>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { ProtocolItem } from '@services/observations/protocol.service';

export default defineComponent({
  name: 'PressButton',

  props: {
    observable: {
      type: Object as PropType<ProtocolItem>,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  emits: ['click'],

  setup(props, { emit }) {
    const state = reactive({
      isPressed: false,
    });

    const computedState = {} as const;

    const methods = {
      handleClick: () => {
        if (props.disabled) return;
        state.isPressed = true;
        emit('click', props.observable);
        setTimeout(() => {
          state.isPressed = false;
        }, 200);
      },
    };

    return {
      state,
      computedState,
      methods,
    };
  }
});
</script>

<style scoped>
.press-button {
  transition: all 0.2s ease;
  position: relative;
}

.press-button:hover:not(.disabled-button) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.press-button:active:not(.disabled-button) {
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 