<template>
  <StandardLayout>
    <d-page class="row items-center justify-evenly"> Hi standard </d-page>
  </StandardLayout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import StandardLayout from '@lib-improba/components/layouts/standard/Index.vue';

export default defineComponent({
  components: { StandardLayout },
  setup() {
    return {};
  },
});
</script>
