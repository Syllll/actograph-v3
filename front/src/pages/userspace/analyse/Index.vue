<template>
  <DPage>
    <div class="full-width full-height">
      <Graph />
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Graph from './_components/graph/Index.vue';

export default defineComponent({
  components: {
    Graph,
  },
  setup() {
    return {};
  },
});
</script>
