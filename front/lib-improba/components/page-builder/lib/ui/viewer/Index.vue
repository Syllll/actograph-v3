<template>
  <Tree
    v-if="treeState.pageBuilderJson"
    :myTreeId="stateless.treeId"
    readonly
    :builderVars="props.builderVars"
    :builderStyle="<any>props.builderStyle"
  />
</template>

<script lang="ts">
import {
  defineComponent,
  watch,
  onBeforeMount,
  PropType,
  onBeforeUnmount,
} from 'vue';
import { Tree } from './../../tree';
import { useTreeState } from '../use-tree-state';
import { useQuasar } from 'quasar';
import { useBuilderStyle, builderStyleProps } from '../use-builder-style';
import { INode } from '../../tree/types';

export default defineComponent({
  components: {
    Tree,
  },
  props: {
    readonly: {
      type: Boolean,
      default: true,
      description:
        'If true, the viewer will be in readonly mode and the user will not be able to edit the page.',
    },
    filterAvailableComponents: {
      type: Function as PropType<(components: string[]) => string[] | null>,
      default: () => null,
      description:
        'A function that will be called with the list of available components and should return the list of available components.',
    },
    modelValue: {
      type: Object as PropType<INode>,
      required: false,
    },
    treeId: {
      type: String,
      required: false,
    },
    builderVars: {
      type: Object,
      required: false,
    },
    ...builderStyleProps,
  },
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;
    const { treeState, methods, stateless } = useTreeState(props, context);
    const builderStyle = useBuilderStyle(stateless.treeId, props);

    return {
      props,
      treeState,
      screen,
      stateless,
    };
  },
});
</script>

<style lang="scss">
@import './../_pagebuilder.scss';
</style>
