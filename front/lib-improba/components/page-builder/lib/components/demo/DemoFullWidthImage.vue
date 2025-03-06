<template>
  <div class="banner-container" style="">
    <q-img
      class="full-width-banner relative-position"
      src="https://picsum.photos/1000/800"
      alt="Full width banner"
    >
      <div class="absolute-center">
        <h1 class="q-pa-none q-ma-none">{{ $props.text }}</h1>
      </div>
    </q-img>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {
    text: {
      type: String,
      default: 'Titre H1',
    },
  },
  emits: [],
  builderOptions: {
    slots: ['default'],
    category: 'Demo',
    description: '',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>

<style scoped lang="scss">
.banner-container {
  position: relative;
  width: 100%;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
  z-index: 0; /* Ensure banner is below content */
}

.full-width-banner {
  width: 100vw;
  height: 20rem;
}
</style>
