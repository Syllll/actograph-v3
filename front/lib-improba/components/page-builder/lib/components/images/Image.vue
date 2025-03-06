<template>
  <div :class="`text-center ${props.class} ${props.customStyle}`">
    <q-img
      :fit="props.fit"
      :caption="props.caption"
      :noSpinner="props.noSpinner"
      :src="props.url"
      :style="`height: ${props.imageHeight}; max-width: ${props.imageWidth};`"
    >
      <div
        v-if="props.caption?.length"
        class="absolute-bottom text-subtitle1 text-center"
      >
        {{ props.caption }}
      </div>
    </q-img>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';
import EmptySlot from '../../tree/empty-slot/Index.vue';
import { QImgProps } from 'quasar';

export default defineComponent({
  components: {
    EmptySlot,
  },
  props: {
    customStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Style' },
    },
    class: {
      type: String,
      default: '',
      builderOptions: { label: 'Class' },
    },
    url: {
      type: String,
      default: 'https://picsum.photos/500/300',
    },
    imageWidth: {
      type: String,
      default: '10rem',
    },
    imageHeight: {
      type: String,
      default: '10rem',
    },
    fit: {
      type: String as PropType<QImgProps['fit']>,
      default: 'contain',
      builderOptions: { options: ['contain', 'cover'] },
    },
    caption: {
      type: String,
      default: '',
    },
    noSpinner: {
      type: Boolean,
      default: true,
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    description: 'A simple image .',
    icon: 'mdi-image',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
