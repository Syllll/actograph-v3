<template>
  <DPage>
    <router-view />
  </DPage>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';

export default defineComponent({
  components: {},
  setup() {
    const stateless = {};
    const state = reactive({});
    return { stateless, state };
  },
});
</script>
