<template>
  <div
    class="overflow-hidden"
    :width="props.customWidth"
    :height="props.customHeight"
  >
    <iframe
      :src="props.src || ''"
      :width="props.frameWidth"
      :height="props.frameHeight"
      :allow="props.allow"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { useProps } from '../../ui/use-props';

const { methods: propsMethods } = useProps()

const styleProps: any = propsMethods.getPropsByTheme('style')
const sizeProps: any = propsMethods.getPropsByTheme('size', 'Container')
const frameProps: any = propsMethods.createMultipleStringProps(['frameClass', 'frameWidth', 'frameHeight'], 'Frame')

export default defineComponent({
  props: {
    src: {
      type: String,
      builderOptions: { label: 'URL', default: '' },
    },
    ...styleProps,
    ...sizeProps,
    ...frameProps,
    allow: {
      type: String,
      builderOptions: {
        default: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      },
      required: false
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    type: 'iframe',
    description: 'Default YouTube iframe',
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
