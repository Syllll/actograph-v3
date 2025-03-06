<template>
  <div class="row q-gutter-md">
    <DBtn color="blue" @click="state.triggerOpen = true"
      >Afficher la modale</DBtn
    >
    <DBtn color="blue" @click="state.triggerClose = true"
      >Masquer la modale</DBtn
    >
    <p class="text-white">state.modal = {{ state.triggerOpen }}</p>
    <DModal
      title="Titre"
      class="col-5"
      v-model:triggerOpen="state.triggerOpen"
      v-model:triggerClose="state.triggerClose"
    >
      Contenu de la modale
    </DModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  setup() {
    const state = reactive({
      triggerOpen: false,
      triggerClose: false,
    });

    return {
      state,
    };
  },
});
</script>
