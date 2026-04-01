<template>
  <q-layout view="hHh lpR fff">
    <q-header v-if="$q.platform.is.electron">
      <ElectronBar />
    </q-header>

    <q-page-container
      :class="{
        'q-ml-sm': drawer.sharedState.showDrawer,
      }"
    >
      <slot><router-view /></slot>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ElectronBar from './../electron-bar/Index.vue';
import { useDrawer } from 'src/composables/use-drawer';

export default defineComponent({
  components: {
    ElectronBar,
  },
  setup() {
    const drawer = useDrawer();

    return {
      drawer,
    };
  },
});
</script>
