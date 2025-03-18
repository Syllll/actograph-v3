<template>
  <q-layout view="hHh lpR fff">
    <q-header>
      <ElectronBar v-if="$q.platform.is.electron" />
      <Toolbar
        :roleTitle="props.roleTitle"
        :userMenuItems="computedState.userMenuItems.value"
        :themeLabel="props.themeLabel"
      >
        <slot name="toolbar" />
      </Toolbar>
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
import {
  defineComponent,
  reactive,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';
import { useRouter } from 'vue-router';
import Toolbar from './toolbar/Index.vue';
import { userMenuItems } from './user-menu-items';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { useI18n } from 'vue-i18n';
import ElectronBar from './../electron-bar/Index.vue';
import { useDrawer } from 'src/pages/userspace/_components/drawer/use-drawer';

export default defineComponent({
  components: {
    Toolbar,
    ElectronBar,
  },
  props: {
    menuItems: {
      type: Array as any,
      default: () => null,
    },
    profileMenuItems: {
      type: Array as any,
      default: () => null,
    },
    roleTitle: {
      type: String,
      default: '',
      required: false,
    },
    themeLabel: {
      type: String,
      default: '',
      required: false,
    },
  },
  setup(props) {
    const router = useRouter();
    const i18n = useI18n();
    const auth = useAuth(router);
    const drawer = useDrawer();

    const stateless = {};

    const computedState = {
      appVersion: computed(() => {
        return process.env.APP_VERSION;
      }),
      userMenuItems: computed(() => {
        if (props.profileMenuItems) {
          return props.profileMenuItems;
        }
        return userMenuItems(i18n, router);
      }),
    };

    const methods = {
      async init() {},
    };

    onMounted(async () => {
      await methods.init();
    });

    onUnmounted(() => {});

    return {
      props,
      drawer,
      stateless,
      computedState,
      methods,
    };
  },
});
</script>
