<template>
  <div class="q-mx-md" style="flex: none">
    <div class="row">
      <q-img
        contain
        width="6rem"
        src="actograph_logo_med.jpeg"
        class="q-ma-none q-pa-none q-mr-sm"
        @click="methods.goToDashboard"
      />
      <!--<div
        :class="`text-bold row items-center justify-center ${
          screen?.lt.sm ? 'text-h6' : 'text-h4'
        }`"
        @click="methods.goToDashboard"
      >
        ActoGraph
      </div> -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup(props) {
    const quasar = useQuasar();
    const router = useRouter();

    const stateless = {
      quasar,
    };

    const computedState = reactive({
      enable: computed(() => {
        // const currentRoleStr = currentRole();
        return true;
      }),
    });

    const methods = {
      goToDashboard: () => {
        /* const route = routeFromRole({
          name: 'dashboard',
        })
        return route */
        router.push({ name: 'user' });
      },
    };

    return {
      stateless,
      computedState,
      methods,
      screen: quasar.screen,
    };
  },
});
</script>
