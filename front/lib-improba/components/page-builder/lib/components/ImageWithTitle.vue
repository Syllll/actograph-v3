<template>
  <div>
    <div>
      <div
        class="relative-position"
        :style="`width: calc(100vw) !important; height: ${$props.height}; margin-left: calc(-50vw + 50%); ${$props.customStyle}`"
      >
        <q-img class="fit" :fit="'cover'" noSpinner :src="props.url"> </q-img>
        <div class="absolute-center column">
          <h1 :style="$props.titleCustomStyle">{{ $props.title }}</h1>
          <div
            class="text-center text-subtitle1"
            :style="$props.subTitleCustomStyle"
          >
            {{ $props.subTitle }}
          </div>
        </div>
      </div>
    </div>
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
    height: {
      type: String,
      default: '20rem',
      builderOptions: { label: 'Height' },
    },
    customStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Style' },
    },
    title: {
      type: String,
      default: 'Fill me with title text.',
      builderOptions: { label: 'Title text' },
    },
    titleCustomStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Title style' },
    },
    subTitle: {
      type: String,
      default: 'Fill me with subtitle text.',
      builderOptions: { label: 'Subtitle text' },
    },
    subTitleCustomStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Subtitle Style' },
    },
    url: {
      type: String,
      default: 'https://picsum.photos/500/300',
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    description: 'An image banner with a title (and subtitle).',
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
