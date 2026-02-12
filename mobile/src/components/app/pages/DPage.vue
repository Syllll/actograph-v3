<template>
  <Page :padding="padding">
    <slot></slot>
  </Page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Page from './page-view/Page.vue';

export default defineComponent({
  components: { Page },
  props: {
    padding: { type: Boolean, default: false },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>

