<template>
  <ViewC>
    <template
      v-for="([slotKey], index) in Object.entries($slots)"
      :key="index"
      v-slot:[slotKey]="scope"
    >
      <slot v-if="$slots[slotKey]" :name="slotKey" v-bind="{ ...scope }"></slot>
    </template>
  </ViewC>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

import ViewC from './page-view/View.vue';

export default defineComponent({
  components: { ViewC },
  props: {},
  setup(props) {
    const state = reactive({});

    return {
      props,
      state,
    };
  },
});
</script>
