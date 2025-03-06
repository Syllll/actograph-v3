import { defineComponent, reactive, watch, onMounted } from 'vue';
import { QVueGlobals } from 'quasar';

export const useTheme = (quasar: QVueGlobals) => {
  const state = reactive({
    theme: quasar?.dark?.isActive ? 'dark' : 'light',
    user: {} as any,
  });

  const methods = {
    init() {
      try {
        // const user = await UserService.getCurrentUser();
        // state.user = user;
        // methods.setTheme(state.user.preferDarkTheme);
      } catch (err) {
        // methods.setTheme(true, false);
      }
    },
    setTheme(isDark: boolean, updateUser = true) {
      quasar.dark.set(isDark);
      if (updateUser && state.user) {
        if (state.user.preferDarkTheme === isDark) return;

        state.user.preferDarkTheme = isDark;
        try {
          /*await UserService.updateCurrentUser({
            id: state.user.id,
            preferDarkTheme: state.user.preferDarkTheme,
          });
          await store.dispatch('auth/getTokenFromCookie');*/
        } catch (e: any) {}
      }
    },
  };

  return {
    state,
    quasar,
    methods,
  };
};
