<template>
  <q-route-tab no-caps :disable="!computedState.enable" style="flex: none">
    <!--<q-img
      contain
      width="30px"
      src="images/logo.png"
      class="q-mr-md"
      :style="{ filter: stateless.quasar.dark.isActive ? '' : 'invert(1)' }"
      to="/"
    />-->
    <div
      :class="`full-height text-bold row items-center justify-center ${
        screen?.lt.sm ? 'text-h6' : 'text-h4'
      }`"
      @click="methods.goToDashboard"
    >
      Template Improba
    </div>
  </q-route-tab>
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
