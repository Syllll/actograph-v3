<template>
  <q-layout view="hHh lpR fff">
    <q-header>
      <Toolbar
        :roleTitle="props.roleTitle"
        :menuItems="computedState.menuItems.value"
        :userMenuItems="computedState.userMenuItems.value"
        :themeLabel="props.themeLabel"
      >
        <slot name="toolbar" />
      </Toolbar>
    </q-header>
    <q-page-container>
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
import { menuItems } from './menu-items';
import { userMenuItems } from './user-menu-items';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: {
    Toolbar,
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

    const stateless = {
      menuItems,
    };

    const state = reactive({});

    const computedState = {
      appVersion: computed(() => {
        return process.env.APP_VERSION;
      }),
      menuItems: computed(() => {
        const menuItems = props.menuItems ?? [...stateless.menuItems];

        if (auth.sharedState.user?.roles?.includes('admin')) {
          menuItems.push({
            label: 'Admin',
            route: { name: 'admin' },
          });
        }

        return menuItems;
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
      state,
      stateless,
      computedState,
      methods,
    };
  },
});
</script>
