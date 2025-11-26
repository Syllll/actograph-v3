<template>
  <div class="row q-gutter-md">
    <DBtn color="blue" @click="state.triggerOpen = true"
      >Afficher la modale</DBtn
    >
    <p class="text-white">state.modal = {{ state.modal }}</p>
    <DDialog
      title="Titre"
      v-model="state.triggerOpen"
      :width="'50vw'"
    >
      <div class="fit q-pa-sm row justify-center">Contenu</div>
      <template #actions>
        <DCancelBtn class="q-mx-sm" @click="state.triggerOpen = false" label="Annuler" />
        <DSubmitBtn
          :loading="state.loading"
          class="q-mx-sm"
          @click="state.loading = true"
          label="Valider"
        />
      </template>
    </DDialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  setup() {
    const state = reactive({
      loading: false,
      triggerOpen: false,
      triggerClose: false,
    });

    return {
      state,
    };
  },
});
</script>
