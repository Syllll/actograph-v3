<template>
  <Page>
    <slot></slot>
  </Page>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

import Page from './page-view/Page.vue';

export default defineComponent({
  components: { Page },
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
