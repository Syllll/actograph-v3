<template>
  <div class="fit column items-center">
    <div class="q-mb-md text-bold text-h3 text-center">Login</div>
    <div class="row justify-center full-width">
      <div
        class="col-12 col-sm-10 col-md-6 col-lg-4 bg-secondary-medium q-pa-md rounded-borders"
      >
        <div ref="topAnchor"></div>

        <Transition
          enter-active-class="animated bounceInLeft"
          leave-active-class="animated bounceOutRight"
          appear
        >
          <q-banner
            v-if="state.errorInForm !== ''"
            class="bg-negative text-white rounded-borders"
          >
            {{ state.errorInForm }}
          </q-banner>
          <q-banner class="bg-accent" v-else-if="state.alertInfo">
            {{ state.alertInfo ? state.alertInfo.message : '' }}
          </q-banner>
        </Transition>

        <q-form ref="formRef" class="column">
          <q-input
            type="email"
            v-model="state.form.login"
            :placeholder="i18n.t('auth.login')"
            :rules="rules.email"
          />

          <q-input
            :type="state.isPwd ? 'password' : 'text'"
            v-model="state.form.password"
            :placeholder="i18n.t('auth.password')"
            :rules="rules.passwordSimple"
          >
            <template v-slot:append>
              <q-icon
                :name="state.isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="state.isPwd = !state.isPwd"
              />
            </template>
          </q-input>

          <Transition
            v-if="state.forgotPassword"
            blue
            enter-active-class="animated bounceInLeft"
            leave-active-class="animated bounceOutRight"
            appear
          >
            <q-banner class="text-white rounded-borders">
              {{ i18n.t('auth.forgottenPwd.mailForNewPwd') }}
            </q-banner>
          </Transition>
          <div class="row justify-end" v-else>
            <DTextLink
              disable
              color="accent-medium"
              bold
              noUnderline
              @click="methods.forgotPassword"
            >
              {{ i18n.t('auth.forgottenPwd.requestNewPwd') }}
            </DTextLink>
          </div>

          <div class="row justify-center q-my-md">
            <q-btn
              class="row justify-center q-px-lg"
              @click="methods.submit"
              color="accent-higher"
              rounded
              no-caps
              size="1.0rem"
              :label="i18n.t('auth.connect')"
              :loading="state.loading"
            />
          </div>

          <div class="row justify-center">
            {{ i18n.t('auth.noAccount') }} &nbsp;
            <DTextLink
              color="accent-medium"
              bold
              noUnderline
              @click="$router.push({ name: 'auth_register' })"
            >
              {{ i18n.t('auth.newAccount') }}
            </DTextLink>
          </div>
        </q-form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { useI18n } from 'vue-i18n';
import { useKeypress } from 'vue3-keypress';
import { UserService } from '@services/users/user.service';
import AuthService from '@services/users/auth.service';
import { useRules } from 'src/../lib-improba/composables/use-rules';
import { createDialog } from 'src/../lib-improba/utils/dialog.utils';

export default defineComponent({
  props: {},
  components: {},
  setup(props, { emit }) {
    const formRef = ref(null);
    const $q = useQuasar();
    // const screen = $q.screen;
    const router = useRouter();
    const route = useRoute();
    const auth = useAuth(router);
    const i18n = useI18n();
    const rules = useRules();

    const state = reactive<any>({
      errored: false,
      errorInForm: '',
      loading: false,
      isPwd: true,
      alertInfo: null,
      forgotPassword: false,
      form: {
        login: null,
        password: null,
      },
    });

    onMounted(() => {
      state.errorInForm = '';
      // this.errorInForm = errorMessage
    });

    const methods = {
      async submit() {
        state.loading = true;

        state.errorInForm = '';

        const validate = await (formRef as any).value.validate();
        if (!validate) {
          state.errorInForm = i18n.t('auth.errors');
          state.loading = false;
          return;
        }

        try {
          await auth.methods.login(state.form.login, state.form.password);

          if (auth.sharedState.user !== null) {
            const roles = auth.sharedState.user.roles;
            //if (roles.includes('superadmin') || roles.includes(props.type)) {
            // Choose a new password if required
            if (auth.sharedState.user.resetPasswordOngoing) {
              let newPasswordIsChosen = false;
              let newPassword = '';
              while (newPasswordIsChosen === false) {
                const dialogReponse = await createDialog({
                  title: i18n.t('auth.newPasswordDialog.title'),
                  message: i18n.t('auth.newPasswordDialog.message'),
                  prompt: {
                    model: newPassword,
                    type: 'text', // optional
                  },
                  cancel: false,
                });
                newPassword = dialogReponse;

                let validation: any = false;
                for (const rule of rules.password) {
                  validation = rule(dialogReponse);
                  if (validation !== true) break;
                }
                if (validation !== true) {
                  await createDialog({
                    title: i18n.t('auth.passwordWrongFormatDialog.title'),
                    message: validation,
                    cancel: false,
                  });
                  newPasswordIsChosen = false;
                  continue;
                }

                await UserService.choosePasswordAfterReset(newPassword);

                newPasswordIsChosen = true;
              }
            }

            // Redirect to original To route
            if (route.query.r) {
              router.push(route.query.r.toString());
            } else {
              router.push({ name: 'user' });
            }
            //} else state.errorInForm = i18n.t('loginModal.wrongRole');
          } else {
            state.errorInForm = i18n.t('auth.wrongAuth');
          }
        } catch (err: any) {
          console.error(err);
          state.errorInForm = i18n.t('auth.wrongAuth');
          state.loading = false;
        }

        state.loading = false;
      },
      async forgotPassword() {
        state.forgotPassword = true;

        const username = state.form.login;
        let validation: any = false;
        for (const rule of rules.email) {
          validation = rule(username);
          if (validation !== true) break;
        }

        if (validation !== true) {
          state.errorInForm = i18n.t('rules.email.wrongFormat');
        } else {
          try {
            await AuthService.forgotPassword(username);
            state.forgotPassword = true;
          } catch (err: any) {
            console.error(err);
            state.loading = false;
          }
        }
      },
    };

    useKeypress({
      keyEvent: 'keydown',
      keyBinds: [
        {
          keyCode: 'enter', // or keyCode as integer, e.g. 40
          success() {
            methods.submit();
          },
        },
      ],
    });

    return {
      rules,
      state,
      methods,
      formRef,
      i18n,
    };
  },
});
</script>
