<template>
  <Layout>
    <Drawer> </Drawer>
    <router-view />
  </Layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Drawer from './_components/drawer/Index.vue';
import Layout from '@lib-improba/components/layouts/standard/Index.vue';

export default defineComponent({
  components: { Drawer, Layout },
});
</script>
