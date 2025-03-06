<template>
  <EmptyLayout>
    <d-page class="row items-center justify-evenly"> Hi home </d-page>
  </EmptyLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    return {};
  },
});
</script>
