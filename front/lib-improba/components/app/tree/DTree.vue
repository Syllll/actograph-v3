<template>
  <q-tree ref="treeRef">
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
  components: {},
  props: {},
  emits: [],
  setup() {
    const treeRef = ref<any>(null);
    return {
      treeRef,
    };
  },
});
</script>
