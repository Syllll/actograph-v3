<template>
  <Layout :menuItems="stateless.menuItems">
    <DPage>
      <router-view />
    </DPage>
  </Layout>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import Layout from '@lib-improba/components/layouts/standard/Index.vue';

export default defineComponent({
  components: {
    Layout,
  },
  props: {},
  setup(props) {
    const stateless = {
      menuItems: [],
    };
    return {
      stateless,
    };
  },
});
</script>
