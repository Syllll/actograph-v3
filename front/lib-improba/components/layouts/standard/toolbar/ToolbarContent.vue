<template>
  <DMainToolbar
    style="border-bottom: 1px solid hsla(0, 0%, 100%, 0.12); padding: 20"
  >
    <DTabs class="full-width" :right-icon="'none'">
      <q-btn flat round dense icon="menu" @click="drawer.sharedState.showDrawer = !drawer.sharedState.showDrawer" />

      <Logo v-if="!props.hideLogo" />

      <DSpace />

      <License />

      <DRouteTab
        v-for="item in props.menuItems"
        :key="item.label"
        :to="item.route"
        :label="item.label"
        :disable="item.disable"
      >
      </DRouteTab>

      <slot>
        <DSpace />
        {{ computedState.userName.value }}
        <!--<q-btn dense round icon="person" xclick="methods.goTo()">
            <q-menu>
              <q-list style="min-width: 100px">
                <q-item clickable v-close-popup v-for="item in props.userMenuItems" :key="item.label" :to="item.route">
                  <q-item-section >{{ item.label }}</q-item-section>
                </q-item>

              </q-list>
            </q-menu>
          </q-btn>-->
        <DBtnDropdown
          class="q-ml-sm"
          rounded
          icon="person"
          xclick="methods.goTo()"
        >
          <d-list style="min-width: 100px">
            <d-item
              clickable
              v-close-popup
              v-for="item in props.userMenuItems"
              :key="item.label"
              :to="item.route"
              class="row justify-center"
            >
              <template v-if="item.name === 'quit'">
                <DSubmitBtn label="Logout" @click="methods.logout" />
              </template>
              <template v-else-if="item.name === 'theme'">
                <theme-toggler />
              </template>
              <template v-else>
                <d-item-section>{{ item.label }}</d-item-section>
              </template>
            </d-item>
          </d-list>
        </DBtnDropdown>
      </slot>
    </DTabs>
  </DMainToolbar>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';
import Logo from '../../Logo.vue';
import { useRouter } from 'vue-router';
import ThemeToggler from '../../theme-toggler/ThemeToggler.vue';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { useLicense } from 'src/composables/use-license';
import License from './license/Index.vue';
import { useDrawer } from 'src/pages/userspace/_components/drawer/use-drawer';

export default defineComponent({
  components: {
    Logo,
    ThemeToggler,
    License,
  },
  props: {
    menuItems: {
      type: Array as any,
      default: () => [],
    },
    userMenuItems: {
      type: Array as any,
      default: () => [],
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
    hideLogo: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  setup(props) {
    const router = useRouter();
    const auth = useAuth(router);
    const license = useLicense();
    const drawer = useDrawer();

    const state = reactive({});
    const stateless = {};

    const computedState = {
      appVersion: computed(() => {
        return process.env.APP_VERSION;
      }),
      userName: computed(() => {
        const user = auth.sharedState?.user;
        let userName =
          user?.firstname ?? user?.userJwt?.username ?? props.roleTitle;

        // Remove the username prefix if it exists
        if (userName.startsWith('_pc-')) {
          userName = userName.slice(4);
        }

        return userName;
      }),
    };

    const methods = {
      goTo() {
        router.push({ name: 'user' });
      },
      async init() {},
      logout() {
        auth.methods.logout();
      },
    };

    onMounted(async () => {
      await methods.init();
    });

    onUnmounted(() => {});

    return {
      props,
      state,
      drawer,
      stateless,
      computedState,
      methods,
      license,
    };
  },
});
</script>
