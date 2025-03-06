<template>
  <Layout :menuItems="stateless.menuItems">
    <Drawer> </Drawer>
    <router-view />
  </Layout>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import Drawer from './_components/drawer/Index.vue';
import Layout from '@lib-improba/components/layouts/standard/Index.vue';

export default defineComponent({
  components: { Drawer, Layout },
  setup() {
    const stateless = {
      menuItems: [],
    };
    const state = reactive({
      showDrawer: true,
    });
    return { stateless, state };
  },
});
</script>
