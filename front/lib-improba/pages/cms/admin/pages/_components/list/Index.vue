<template>
  <div class="q-my-md row">
    <PageTableHeader v-model="state.searchText" @reload="methods.reload" />
  </div>
  <PageTable ref="pageTableRef" :searchText="state.searchText" />
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import PageTable from './table/Index.vue';
import PageTableHeader from './header/Index.vue';

export default defineComponent({
  components: {
    PageTableHeader,
    PageTable,
  },
  setup() {
    const pageTableRef = ref(null);
    const stateless = {};
    const state = reactive({
      searchText: '',
    });
    const methods = {
      reload: () => {
        pageTableRef.value?.methods.reload();
      },
    };
    return { stateless, state, methods, pageTableRef };
  },
});
</script>
