<template>
  <span
    v-html="props.text"
    :class="`a1-desc${props.size} ${props.customClass}`"
    :style="props.customStyle"
  />
</template>

<script lang="ts">
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';
import { defineComponent } from 'vue';

const { methods: propsMethods } = useProps()
const styleProps: any = propsMethods.getPropsByTheme('style')

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
          { label: 'Petit (18px)', value: '-small' },
          { label: 'Normal (28px)', value: '' },
          { label: 'Grand (32px)', value: '-big' }
        ]
      }
    }
  },
  builderOptions: {
    slots: ['default'],
    category: 'A1',
    description: 'A description',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
