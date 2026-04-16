<template>
  <StandardLayout>
    <template #drawer>
      <Drawer />
    </template>
    <router-view />
  </StandardLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import StandardLayout from '@lib-improba/components/layouts/standard/Index.vue';
import Drawer from './_components/drawer/Index.vue';

export default defineComponent({
  components: { StandardLayout, Drawer },
});
</script>
