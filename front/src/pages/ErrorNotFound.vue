<template>
  <div class="fit column items-center justify-center q-pa-md text-grey-7">
    <q-icon name="mdi-alert-circle-outline" size="48px" />
    <div class="text-h6 q-mt-md">Page introuvable</div>
    <div class="text-caption q-mt-xs">{{ currentPath }}</div>
  </div>
  <!--<div
    class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center"
  >
    <div>
      <div style="font-size: 30vh">404</div>

      <div class="text-h2" style="opacity: 0.4">Oops. Nothing here...</div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        to="/home"
        label="Go Home"
        no-caps
      />
    </div>
  </div>-->
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
export default defineComponent({
  name: 'ErrorNotFound',
  setup() {
    const router = useRouter();
    const route = useRoute();

    console.log('current route url: ', router.currentRoute.value.fullPath);
    const currentPath = computed(() => router.currentRoute.value.fullPath);
    return {
      currentPath,
      goHome() {
        router.push('/home');
      },
    };
  },
});
</script>
