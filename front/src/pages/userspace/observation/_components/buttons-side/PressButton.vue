<template>
  <q-btn
    class="press-button"
    :class="{ 'is-active': state.isPressed, 'disabled-button': disabled }"
    rounded
    no-caps
    dense
    :disable="disabled"
    @click="methods.handleClick()"
  >
    <q-icon name="mdi-target" class="press-target" />
    <span class="press-label">{{ observable.name }}</span>
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
  /* État de repos (mode ponctuel) : gris très clair via le token --button-rest-bg
     (clair #f5f5f5 = Quasar grey-2 / sombre = --neutral-lower), texte noir.
     Le token est partagé avec SwitchButton (mode continu) : même fond de repos
     partout en mode clair. Le token gère les deux thèmes, pas d'override .body--dark. */
  background-color: var(--button-rest-bg) !important;
  color: var(--text) !important;
  /* Échelle d'affichage (boutons) pilotée par --ui-scale (défaut 1), posée par
     le dashboard sur .categories-wrapper. Comme en mobile. On ne scalte QUE
     font-size : Quasar dense (padding 0.285em, min-height 2em) suit font-size.
     À scale=1 (14px) = taille native, aucun changement par défaut. */
  font-size: calc(14px * var(--ui-scale, 1)) !important;
  /* Bouton à largeur de contenu dans un conteneur en row : ne s'étire pas quand
     la catégorie est élargie (flex: 0 0 auto), caps à 100% pour ne pas déborder,
     et les libellés longs tronquent (ellipsis) plutôt que d'agrandir le bouton. */
  flex: 0 0 auto;
  max-width: 100%;
  overflow: hidden;
}

.press-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* Indicateur « cible » : signale que le bouton est de type push (ponctuel).
   Rond concentrique mdi-target à gauche du libellé, atténué au repos. */
.press-target {
  margin-right: calc(6px * var(--ui-scale, 1));
  font-size: calc(16px * var(--ui-scale, 1));
  opacity: 0.7;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* État actif au clic : flash orange identique au mode continu (var(--accent-strong)),
   texte blanc, et la cible se « charge » (opacité pleine + léger zoom).
   --accent-strong (#c2410c) plutôt que --accent (#f97316) : blanc dessus = ~5.2:1
   (AA) au lieu de ~2.8:1. */
.press-button.is-active {
  background-color: var(--accent-strong) !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}

.press-button.is-active .press-target {
  opacity: 1;
  transform: scale(1.15);
}

.press-button:hover:not(.disabled-button):not(.is-active) {
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