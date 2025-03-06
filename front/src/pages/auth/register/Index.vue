<template>
  <DPage>
    <div class="fit column items-center">
      <div class="q-mb-md text-bold text-h3 text-center">Sign up</div>
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
                @click="methods.submit"
                color="accent-medium"
                rounded
                no-caps
                size="1.0rem"
                :label="i18n.t('auth.register')"
                :loading="state.loading"
              />
            </div>

            <div class="row justify-center">
              {{ i18n.t('auth.alreadyRegistered') }} &nbsp;
              <DTextLink
                color="accent-medium"
                bold
                noUnderline
                @click="$router.push({ name: 'auth_login' })"
              >
                {{ i18n.t('auth.connect') }}
              </DTextLink>
            </div>
          </q-form>
        </div>
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import { useKeypress } from 'vue3-keypress';
import { UserService } from '@services/users/user.service';
import AuthService from '@services/users/auth.service';
import { useRules } from '@lib-improba/composables/use-rules';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@lib-improba/composables/use-auth';
import { createDialog } from '@lib-improba/utils/dialog.utils';

export default defineComponent({
  props: {},
  components: {},
  setup(props, { emit }) {
    const formRef = ref(null);
    const $q = useQuasar();
    // const screen = $q.screen;
    const router = useRouter();
    const i18n = useI18n();
    const rules = useRules();
    const auth = useAuth(router);

    const state = reactive<any>({
      errored: false,
      errorInForm: '',
      loading: false,
      isPwd: true,
      isPwdConfirm: true,
      alertInfo: null,

      form: {
        login: null,
        password: null,
        passwordConfirm: null,
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

        if (state.form.password !== state.form.passwordConfirm) {
          state.errorInForm = i18n.t('auth.passwordNotConfirmed');
          state.loading = false;
          return;
        }

        try {
          const response = await AuthService.create(
            state.form.login,
            state.form.password
          );
        } catch (err: any) {
          console.error(err);
          state.errorInForm = i18n.t('auth.errors');
          state.loading = false;
          return;
        }

        await createDialog({
          title: i18n.t('auth.registerDoneDialog.title'),
          message: i18n.t('auth.registerDoneDialog.message'),
          cancel: false,
        });

        router.push({
          name: 'user',
        });

        state.loading = false;
      },
    };

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
