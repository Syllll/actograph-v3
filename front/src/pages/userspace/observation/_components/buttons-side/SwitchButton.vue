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
  /* border-style doit être fixé ici : l'état actif ne modifie que border-color et
     border-width, sans un border-style déjà posé la bordure active ne s'affiche pas */
  border: 1px solid transparent;
  /* État de repos (mode continu) : gris clair/foncé selon le thème via le token
     --button-rest-bg, uniquement l'état actif reste coloré (orange) -
     même logique que PressButton (mode ponctuel) */
  background-color: var(--button-rest-bg) !important;
  color: var(--text) !important;
  font-weight: normal;
}

.switch-button:hover:not(.disabled-button):not(.active) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Bug 2.1 : État actif plus visible - contraste renforcé.
   Fond --accent-strong (#c2410c, orange plus foncé) pour que le texte blanc
   atteigne ~5.2:1 (AA), au lieu de --accent (#f97316) qui ne donnait que ~2.8:1. */
.switch-button.active {
  background-color: var(--accent-strong) !important;
  color: white !important;
  border-color: var(--accent-strong) !important;
  border-width: 2px !important;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
  font-weight: 600;
}

.switch-button.active:hover:not(.disabled-button) {
  background-color: var(--accent-strong) !important;
  opacity: 0.95;
  box-shadow: 0 3px 10px rgba(249, 115, 22, 0.5);
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 