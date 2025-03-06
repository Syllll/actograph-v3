<template>
  <DTabView :tabs="stateless.tabs">
    <template v-slot:tab1> Tab 1 </template>
    <template v-slot:tab2> Tab 2 </template>
  </DTabView>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';

export default defineComponent({
  setup() {
    const stateless = {
      tabs: [
        {
          name: 'tab1', // Used in the v-slot template
          label: 'Tab 1', // Show to the user
        },
        {
          name: 'tab2', // Used in the v-slot template
          label: 'Tab 2', // Show to the user
        },
      ],
    };

    return {
      stateless,
    };
  },
});
</script>
