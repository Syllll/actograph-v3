<template>
  <div class="row q-gutter-md">
    <DBtn color="blue" @click="state.triggerOpen = true"
      >Afficher la modale</DBtn
    >
    <p class="text-white">state.modal = {{ state.modal }}</p>
    <DModal
      title="Titre"
      v-model:triggerOpen="state.triggerOpen"
      :minWidth="'50vw'"
      :maxHeight="'30rem'"
    >
      <div class="fit q-pa-sm row justify-center">Contenu</div>
      <template v-slot:layout-buttons>
        <div>
          <DCancelBtn class="q-mx-sm" @click="state.modal = false" />
        </div>
        <div>
          <DSubmitBtn
            :loading="state.loading"
            class="q-mx-sm"
            @click="state.loading = true"
          />
        </div>
      </template>
    </DModal>
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
