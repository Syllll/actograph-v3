<template>
  <EmptyLayout>
    <d-page class="row items-center justify-evenly"> Hi home </d-page>
  </EmptyLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    const router = useRouter();

    onMounted(() => {
      console.log(
        'current route url for home: ',
        router.currentRoute.value.fullPath
      );
      const urlLoc = window.location.href;
      console.log('urlLoc: ', urlLoc);
    });
    return {};
  },
});
</script>
