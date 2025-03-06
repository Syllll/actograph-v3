<!-- Exemple de boutton qui ajoute du texte à chaque clic -->
<template>
  <div class="column full-width">
    <div class="col-auto column full-width">
      <div class="col-auto text-h6 q-pb-sm q-pt-md">Boutons avancés</div>
      <div class="col-auto q-py-sm q-pt-md">{{ state.message }}</div>
      <div class="col-auto row full-width q-gutter-x-sm">
        <DSubmitBtn
          @click="methods.showMessage"
          label="Add Text"
          :disable="state.toggle2"
        />
        <DBtn @click="methods.clearMessage" label="Clear Text" />

        <DToggle
          label="Désactiver bouton add text"
          v-model="state.toggle2"
        ></DToggle>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive, onMounted } from 'vue';

export default {
  props: {},
  components: {},
  setup() {
    const stateless = {};

    const state = reactive({
      message: 'Text',
      toggle2: false,
    });

    const methods = {
      clearMessage: () => {
        state.message = '';
      },
      showMessage: () => {
        state.message = state.message + ' Text';
      },
    };

    onMounted(() => {});

    return {
      stateless,
      state,
      methods,
    };
  },
};
</script>
