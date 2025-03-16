<template>
  <EmptyLayout>
    <DPage>
      <router-view />
    </DPage>
  </EmptyLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    return {};
  },
});
</script>
