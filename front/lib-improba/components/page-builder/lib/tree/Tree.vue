<template>
  <div :id="`pb-tree-${props.myTreeId}`" class="fit tree">
    <Node
      v-if="tree.sharedState.pageBuilderJson"
      :builderJson="tree.sharedState.pageBuilderJson"
      :builderVars="props.builderVars"
      :builderStyle="props.builderStyle"
      :myTreeId="props.myTreeId"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue';
import { onMounted } from 'vue';

import { Node } from './';
import { useTree } from './use-tree';

export default defineComponent({
  components: {
    Node,
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
    builderVars: {
      type: Object,
      required: false,
    },
    builderStyle: {
      type: Object,
      required: false,
    },
    readonly: {
      type: Boolean,
      required: false,
    },
  },
  emits: ['update:myTreeId', 'update:modelValue'],
  setup(props, context) {
    const tree = useTree(props.myTreeId);

    // Set the readonly value at the scale of the tree
    if (props.readonly !== undefined) {
      tree.sharedState.readonly = props.readonly;
    }

    const methods = {};

    onMounted(() => {
    });

    return {
      props,
      methods,
      tree,
    };
  },
});
</script>

<style lang="scss" scoped>

</style>
