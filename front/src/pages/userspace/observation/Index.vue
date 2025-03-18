<template>
  <DPage>
    <q-splitter v-model="state.splitterModel" class="fit">
      <template v-slot:before> Tableau de bord </template>
      <template v-slot:separator>
        <q-avatar
          color="accent"
          text-color="white"
          size="md"
          icon="drag_indicator"
        />
      </template>
      <template v-slot:after> Relevés </template>
    </q-splitter>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  setup() {
    const state = reactive({
      splitterModel: 50,
    });

    return {
      state,
    };
  },
});
</script>
