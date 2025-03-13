<style lang="scss" scoped>
.indicator--container {
  display: flex;
  justify-content: center;
  align-items: center;

  padding-left: 10px;

  .indicator {
    border-radius: 50%;

    background: whitesmoke;

    width: 50px;
    aspect-ratio: 1;

    margin-left: -10px;
  }
}
</style>

<template>
  <div class="indicator--container">
    <img
      v-for="(indicator, i) in stateless.indicators"
      :key="'indicator_' + i"
      class="indicator"
      :src="indicator.img"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

export default defineComponent({
  // props: {},
  emits: [],
  builderOptions: {
    slots: [],
    category: 'A1',
    description: 'A1 faces deco',
  },
  setup(props) {
    const stateless = {
      indicators: [
        {
          img: '/a1/indicator/1.png',
        },
        {
          img: '/a1/indicator/2.png',
        },
        {
          img: '/a1/indicator/3.png',
        },
        {
          img: '/a1/indicator/4.png',
        },
      ],
    };

    const state = reactive({});

    const methods = {};

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {});

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
