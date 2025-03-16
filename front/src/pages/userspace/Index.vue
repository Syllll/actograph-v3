<template>
  <StandardLayout>
    <Drawer> </Drawer>
    <router-view />
  </StandardLayout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import StandardLayout from '@lib-improba/components/layouts/standard/Index.vue';
import Drawer from './_components/drawer/Index.vue';

export default defineComponent({
  components: { StandardLayout, Drawer },
  setup() {
    return {};
  },
});
</script>
