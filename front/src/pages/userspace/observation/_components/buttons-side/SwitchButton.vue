<template>
  <q-btn
    class="switch-button"
    :class="{ 'active': active, 'disabled-button': disabled }"
    :label="observable.name"
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
  /* État de repos (mode continu) : gris clair/foncé selon le thème via le token
     --button-rest-bg, uniquement l'état actif reste coloré (orange) -
     même logique que PressButton (mode ponctuel) */
  background-color: var(--button-rest-bg) !important;
  color: var(--text) !important;
  font-weight: normal;
  /* Échelle d'affichage (boutons) pilotée par --ui-scale (défaut 1), posée par
     le dashboard sur .categories-wrapper. Comme en mobile. On ne scalte QUE
     font-size : Quasar dense utilise padding: 0.285em et min-height: 2em (em),
     donc ils suivent font-size automatiquement. À scale=1 (14px) on retrouve
     exactement la taille native, sans changement visuel par défaut. */
  font-size: calc(14px * var(--ui-scale, 1)) !important;
  /* Reflow en row sous le conteneur (row + flex-wrap) : on garde l'aspect
     d'origine (boutons pleine largeur empilés) tant que la catégorie est
     étroite, puis les boutons se mettent en ligne quand on l'élargit.
     flex: 1 0 160px => grow:1 (remplit la ligne), shrink:0 (ne rétrécit pas
     sous 160px = MIN_CATEGORY_WIDTH, wrappait plutôt), basis:160px. À 220px
     (largeur par défaut) un seul bouton tient => pleine largeur empilé
     (aspect d'origine). À 320px+ => 2 par ligne, 480px+ => 3 par ligne. */
  flex: 1 0 160px;
  max-width: 100%;
  overflow: hidden;
}

.switch-button:hover:not(.disabled-button):not(.active) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* État actif « en cours » : fond --accent-strong (#c2410c, orange plus foncé)
   pour que le texte blanc atteigne ~5.2:1 (AA), au lieu de --accent (#f97316)
   qui ne donnait que ~2.8:1. Pas de changement de border-width (base transparent)
   pour éviter tout saut de layout à l'activation. */
.switch-button.active {
  background-color: var(--accent-strong) !important;
  color: white !important;
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