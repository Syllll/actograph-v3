<template>
  <DPage>
    <div class="fit column items-center">
      <div class="q-mb-md text-bold text-h3 text-center">Reset password</div>
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
              :placeholder="i18n.t('auth.newPassword')"
              :rules="rules.passwordMedium"
            >
              <template v-slot:append>
                <q-icon
                  :name="state.isPwd ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="state.isPwd = !state.isPwd"
                />
              </template>
            </q-input>

            <q-input
              :type="state.isPwdConfirm ? 'password' : 'text'"
              v-model="state.form.passwordConfirm"
              :placeholder="i18n.t('auth.passwordConfirm')"
              :rules="rules.passwordMedium"
            >
              <template v-slot:append>
                <q-icon
                  :name="state.isPwdConfirm ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="state.isPwdConfirm = !state.isPwdConfirm"
                />
              </template>
            </q-input>

            <div class="row justify-center q-my-md">
              <q-btn
                class="row justify-center q-px-lg"
                color="accent-higher"
                rounded
                no-caps
                size="1.0rem"
                :label="'Appliquer le nouveau mot de passe'"
                :loading="state.loading"
              />
            </div>
          </q-form>
        </div>
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRules } from '@lib-improba/composables/use-rules';
import { useRouter } from 'vue-router';
import { createDialog } from '@lib-improba/utils/dialog.utils';

export default defineComponent({
  components: {},
  setup(props) {
    const i18n = useI18n();
    const stateless = {};
    const router = useRouter();
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

    const methods = {
      async submitNewPassword() {
        state.loading = true;

        state.errorInForm = '';

        // const validate = await (formRef as any).value.validate();
        // if (!validate) {
        //   state.errorInForm = i18n.t('auth.errors');
        //   state.loading = false;
        //   return;
        // }

        if (state.form.password !== state.form.passwordConfirm) {
          state.errorInForm = i18n.t('auth.passwordNotConfirmed');
          state.loading = false;
          return;
        }

        // try {
        //   const response = await AuthService.create(
        //     state.form.login,
        //     state.form.password
        //   );
        // } catch (err: any) {
        //   console.error(err);
        //   state.errorInForm = i18n.t('auth.errors');
        //   state.loading = false;
        //   return;
        // }

        await createDialog({
          title: i18n.t('auth.registerDoneDialog.title'),
          message: i18n.t('auth.registerDoneDialog.message'),
          cancel: false,
        });

        router.push({
          name: 'auth_login',
        });

        state.loading = false;
      },
    };

    return { state, rules, i18n, props, stateless };
  },
});
</script>
