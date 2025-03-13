<template>
  <div
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter, useRoute } from 'vue-router';
export default defineComponent({
  name: 'ErrorNotFound',
  setup() {
    const router = useRouter();
    const route = useRoute();

    console.log('current route url: ', router.currentRoute.value.fullPath);
    return {
      goHome() {
        router.push('/home');
      },
    };
  },
});
</script>
