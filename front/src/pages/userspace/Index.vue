<template>
  <StandardLayout>
    <template #drawer>
      <Drawer />
    </template>
    <div class="actograph-userspace">
      <router-view />
      <MiniGraphHost :active="route.name === 'user_observation'" />
    </div>
  </StandardLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import MiniGraphHost from 'src/components/mini-graph/MiniGraphHost.vue';
import StandardLayout from '@lib-improba/components/layouts/standard/Index.vue';
import Drawer from './_components/drawer/Index.vue';

export default defineComponent({
  components: { StandardLayout, Drawer, MiniGraphHost },
  setup() { return { route: useRoute() }; },
});
</script>
