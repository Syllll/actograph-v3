<template>
  <q-btn
    class="switch-button"
    :class="{ 'active': active, 'disabled-button': disabled }"
    :label="observable.name"
    color="success"
    outline
    rounded
    dense
    no-caps
    :disable="disabled"
    @click="methods.emitClick()"
  >
    <q-tooltip v-if="observable.description">
      {{ observable.description }}
    </q-tooltip>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, PropType } from 'vue';
import { ProtocolItem } from '@services/observations/protocol.service';

export default defineComponent({
  name: 'SwitchButton',

  props: {
    observable: {
      type: Object as PropType<ProtocolItem>,
      required: true
    },
    active: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['click'],

  setup(props, { emit }) {
    const state = reactive({});
    const computedState = {} as const;
    const methods = {
      emitClick: () => emit('click', props.observable),
    };

    return { state, computedState, methods };
  }
});
</script>

<style scoped>
.switch-button {
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid #ddd;
  font-weight: normal;
}

.switch-button:hover:not(.disabled-button) {
  background-color: #f0f0f0;
  transform: translateY(-1px);
}

.switch-button.active {
  background-color: var(--q-primary);
  color: white;
  border-color: var(--q-primary);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.switch-button.active:hover:not(.disabled-button) {
  background-color: var(--q-primary);
  opacity: 0.9;
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 