<template>
  <div class="relative-position">
    <div
      class="relative-position q-pa-lg"
      :style="`z-index: 1; min-height: 4rem; ${$props.customStyle}`"
    >
      {{ $props.text }}
    </div>

    <div class="absolute-top fit">
      <div
        class="relative-position bg-grey-5"
        style="
          z-index: 0;
          height: 100%;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
        "
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {
    text: {
      type: String,
      default: 'Contenu',
    },
    customStyle: {
      type: String,
      default: 'color: white;',
      builderOptions: {
        label: 'Style',
      },
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
}
</style>
