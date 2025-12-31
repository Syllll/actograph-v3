<template>
  <q-tree v-bind="$attrs" :nodes="$props.nodes" :node-key="$props.nodeKey || 'id'" ref="treeRef">
    <!-- This is here to forward the slots into the q-tree component -->
    <template
      v-for="([slotKey], index) in Object.entries($slots)"
      :key="index"
      v-slot:[slotKey]="scope"
    >
      <slot v-if="$slots[slotKey]" :name="slotKey" v-bind="{ ...scope }"></slot>
    </template>
  </q-tree>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  components: {},
  props: {
    nodes: {
      type: Array as any,
      default: undefined,
    },
    nodeKey: {
      type: String,
      default: undefined,
    },
  },
  emits: [],
  setup() {
    const treeRef = ref<any>(null);
    return {
      treeRef,
    };
  },
});
</script>
