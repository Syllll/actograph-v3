<template>
  <template v-if="router.currentRoute.value.path.includes('blocs/view')">
    <router-view />
  </template>
  <template v-else>
    <List />
  </template>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import List from './_components/list/Index.vue';

export default defineComponent({
  components: { List },
  setup() {
    const router = useRouter();
    const stateless = {};
    const state = reactive({});
    return { stateless, state, router };
  },
});
</script>
