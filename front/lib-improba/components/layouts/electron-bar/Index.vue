<template>
  <q-bar class="q-electron-drag bg-grey-10">
    <div class="row full-width">
      <div class="col-4 row justify-start"></div>
      <div class="col-4 row justify-center text-white text-bold">
        ActoGraph v{{ stateless.appVersion }}
      </div>

      <div class="col-4 row justify-end">
        <q-btn
          class="text-white"
          dense
          flat
          icon="minimize"
          @click="methods.minimize()"
        />
        <q-btn
          class="text-white"
          dense
          flat
          icon="crop_square"
          @click="methods.maximize()"
        />
        <q-btn
          class="text-white"
          dense
          flat
          icon="close"
          @click="methods.quit()"
        />
      </div>
    </div>
  </q-bar>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';
import { useRouter } from 'vue-router';
import systemService from 'src/services/system/index.service';

export default defineComponent({
  setup(props) {
    const router = useRouter();
    const state = reactive({});

    const computedState = {};

    const stateless = {
      appVersion: process.env.APP_VERSION,
    };

    const methods = {
      maximize() {
        systemService.maximize();
      },
      minimize() {
        systemService.minimize();
      },
      async quit() {
        await systemService.exit();
      },
    };

    onMounted(() => {});

    onUnmounted(() => {});

    return {
      props,
      state,
      stateless,
      methods,
    };
  },
});
</script>
