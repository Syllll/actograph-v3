<template>
  <q-img
    :src="props.imageSource"

    class="position-absolute"
    :class="props.customClass"

    style="pointer-events: none !important;"
    :style="{
      ...props.customStyle,
      top: props.top,
      bottom: props.bottom,
      left: props.left,
      right: props.right,
    }"
    :width="props.customWidth"
    :height="props.customHeight"
  />
</template>

<script lang="ts">
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';
import { defineComponent, onMounted, reactive, watch } from 'vue';

const { methods: propsMethods } = useProps();
const sizeProps: any = propsMethods.getPropsByTheme('size')
const styleProps: any = propsMethods.getPropsByTheme('style')
const positionProps: any = propsMethods.createMultipleStringProps(['top', 'bottom', 'left', 'right'], 'Deco')

export default defineComponent({
  props: {
    // ...styleProps,
    ...sizeProps,
    ...positionProps,
    imageSource: {
      type: String,
      required: false,
      default: null,
      builderOptions: {
        category: 'Deco'
      }
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    category: 'A1',
    description: 'Default deco'
  },
  setup(props) {

    const stateless = {
    };

    const state = reactive({
    });

    const methods = {
    };

    const computedState = {
    };

    return {
      props,
      stateless,
      state,
      methods,
      computedState
    };
  },
});
</script>
