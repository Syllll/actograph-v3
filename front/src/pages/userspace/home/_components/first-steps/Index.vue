<template>
  <div class="column">
    <div class="row justify-center">
      <DSubmitBtn label="Charger l'exemple" @click="methods.cloneAndLoadExampleObservation()" />
    </div>
  </div>
</template>

<script lang="ts">
import { useObservation } from 'src/composables/use-observation';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
  },
  setup() {
    const observation = useObservation();

    const methods = {
      cloneAndLoadExampleObservation: async () => {
        const exampleObservation = await observation.methods.cloneExampleObservation();
        await observation.methods.loadObservation(exampleObservation.id);
      },
    };
    return {
      observation,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>

</style>
