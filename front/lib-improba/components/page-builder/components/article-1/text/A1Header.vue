<template>
  <span
    v-html="props.text"
    :class="`a1-header${props.size} ${props.customClass}`"
    :style="props.customStyle"
  />
</template>

<script lang="ts">
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';
import { defineComponent } from 'vue';

const { methods: propsMethods } = useProps();
const styleProps: any = propsMethods.getPropsByTheme('style');

export default defineComponent({
  props: {
    ...styleProps,
    text: {
      type: String,
      required: false,
      default: 'toto',
      builderOptions: { editor: true },
    },
    size: {
      type: String,
      required: false,
      default: '',
      builderOptions: {
        options: [
          { label: 'Normal (56px)', value: '' },
          { label: 'Grand (70px)', value: '-big' },
        ],
      },
    },
  },
  builderOptions: {
    slots: ['default'],
    category: 'A1',
    description: 'A header',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
