<template>
  <div class="full-width row" :style="`${props.customStyle}`">
    <div class="col-12 col-md-6 col-lg-4 text-center">
      <q-img
        :fit="<any>props.fit"
        :caption="props.caption"
        :noSpinner="props.noSpinner"
        :src="props.url"
        :style="{
          height: props.imageHeight,
          maxWidth: props.imageWidth,
        }"
      >
        <div
          v-if="props.caption?.length"
          class="absolute-bottom text-subtitle1 text-center"
        >
          {{ props.caption }}
        </div>
      </q-img>
    </div>
    <div class="col q-pa-sm" v-html="props.text"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';
import EmptySlot from '../tree/empty-slot/Index.vue';

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
    text: {
      type: String,
      default: 'Fill me with text.',
      builderOptions: { editor: true },
    },
    url: {
      type: String,
      default: 'https://picsum.photos/500/300',
    },
    imageWidth: {
      type: String,
      default: '10rem',
      builderOptions: { category: 'size' },
    },
    imageHeight: {
      type: String,
      default: '10rem',
      builderOptions: { category: 'size' },
    },
    fit: {
      type: String,
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
    description: 'An image and a text side by side.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
