<template>
  <q-page :class="['d-page bg-primary-lowest text-text', { 'd-page--clip': props.clipContent }]">
    <div :class="['d-page-content', { 'q-pa-md': props.padding }]">
      <slot></slot>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageView',
  props: {
    padding: { type: Boolean, default: false },
    /**
     * Borne le contenu à la hauteur de la page (overflow hidden).
     * À activer sur les écrans à layout absolu/interne (observation, relevés, graphe)
     * pour éviter qu'un conteneur ne capte les touches au-dessus du footer.
     * Ne pas activer sur l'accueil / paramètres : le scroll vertical y est géré par d-page-content.
     */
    clipContent: { type: Boolean, default: false },
  },
  setup(props) {
    return { props };
  },
});
</script>

<style scoped lang="scss">
.d-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.d-page--clip {
  overflow: hidden;
}

.d-page-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}
</style>

