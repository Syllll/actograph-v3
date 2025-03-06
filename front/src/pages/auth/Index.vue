<template>
  <EmptyLayout>
    <router-view />
  </EmptyLayout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';

export default defineComponent({
  components: { EmptyLayout },
  setup(props) {
    const stateless = {};
    return { props, stateless };
  },
});
</script>
