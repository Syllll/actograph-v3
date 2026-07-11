<template>
  <q-btn
    class="switch-button"
    :class="{ 'active': active, 'disabled-button': disabled }"
    :label="observable.name"
    color="neutral"
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
  /* État de repos (mode continu) : gris clair/foncé selon le thème, uniquement l'état
     actif reste coloré (orange) - même logique que PressButton (mode ponctuel) */
  background-color: #E5E7EB !important;
  color: var(--text) !important;
  font-weight: normal;
}

.body--dark .switch-button {
  background-color: var(--neutral-lower) !important;
}

.switch-button:hover:not(.disabled-button):not(.active) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Bug 2.1 : État actif plus visible - contraste renforcé */
.switch-button.active {
  background-color: var(--accent) !important;
  color: white !important;
  border-color: var(--accent) !important;
  border-width: 2px !important;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
  font-weight: 600;
}

.switch-button.active:hover:not(.disabled-button) {
  background-color: var(--accent) !important;
  opacity: 0.95;
  box-shadow: 0 3px 10px rgba(249, 115, 22, 0.5);
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 