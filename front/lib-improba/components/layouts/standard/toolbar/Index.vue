<template>
  <template v-if="screen.gt.sm">
    <ToolbarContent
      :roleTitle="props.roleTitle"
      :menuItems="props.menuItems"
      :userMenuItems="props.menuItems"
      :profileMenuItems="props.profileMenuItems"
      :themeLabel="props.themeLabel"
    >
    </ToolbarContent>
  </template>
  <template v-else>
    <ToolbarContent hideLogo style="padding: 5 !important; text-align: center">
      <div class="full-width row justify-evenly">
        <slot> </slot>
      </div>
    </ToolbarContent>
  </template>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';
import ToolbarContent from './ToolbarContent.vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuth } from 'src/../lib-improba/composables/use-auth';

export default defineComponent({
  components: {
    ToolbarContent,
  },
  props: {
    menuItems: {
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
  },
  setup(props) {
    const router = useRouter();
    const quasar = useQuasar();
    const auth = useAuth(router);
    const state = reactive({});

    const stateless = {};

    const computedState = {
      appVersion: computed(() => {
        return process.env.APP_VERSION;
      }),
      userName: computed(() => {
        const user = auth.sharedState?.user;
        const userName =
          user?.firstname ??
          user?.userAuth?.username ??
          user?.userJwt?.username ??
          props.roleTitle;
        return userName;
      }),
    };

    const methods = {
      goToLogin() {
        router.push({ name: 'profilChoice' });
      },
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
      screen: quasar.screen,
    };
  },
});
</script>
