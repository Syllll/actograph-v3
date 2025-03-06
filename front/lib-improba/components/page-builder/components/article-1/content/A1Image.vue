<template>
  <div
    :class="props.customClass"
    :style="props.customStyle"

    :width="props.customWidth"
    :height="props.customHeight"
  >

    <q-img
      :src="props.imageSource"
      :class="props.imageClass"

      :width="props.imageWidth"
      :height="props.imageHeight"
    />
  </div>
</template>

<script lang="ts">
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';
import { defineComponent, onMounted, reactive, watch } from 'vue';

const { methods: propsMethods } = useProps();
const sizeProps: any = propsMethods.getPropsByTheme('size')
const styleProps: any = propsMethods.getPropsByTheme('style')
const imageProps: any = propsMethods.createMultipleStringProps(['imageWidth', 'imageHeight', 'imageClass'], 'Image')

export default defineComponent({
  props: {
    ...sizeProps,
    ...styleProps,
    imageSource: {
      type: String,
      builderOptions: {
        category: 'Image'
      },
    },
    ...imageProps,
  },
  builderOptions: {
    slots: ['default'],
    category: 'A1',
    type: 'select',
    description: 'Default A1 section',
  },
  emits: [],
  setup(props) {

    const stateless = {
    };

    const state = reactive({
    });

    const methods = {
    };

    const computedState = {
    };


    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {
    });

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
