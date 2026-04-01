<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide" persistent>
    <DDialogCard
      :title="$t('cloud.loginTitle')"
      icon="mdi-cloud"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :cancelDisable="state.isLoading"
      :submitLabel="$t('cloud.signIn')"
      :submitDisable="!state.email || !state.password"
      :submitLoading="state.isLoading"
      @cancel="onCancelClick"
      @submit="methods.submit"
    >
      <div class="text-caption text-neutral-high q-mb-md">
        {{ $t('cloud.loginIntro') }}
      </div>

      <div class="column q-gutter-md">
        <q-input
          v-model="state.email"
          :placeholder="$t('cloud.email')"
          type="email"
          outlined
          dense
          autofocus
          :rules="[
            (val) => !!val || $t('cloud.emailRequired'),
            (val) => isValidEmail(val) || $t('cloud.emailInvalid'),
          ]"
          :disable="state.isLoading"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-email" />
          </template>
        </q-input>

        <q-input
          v-model="state.password"
          :placeholder="$t('cloud.password')"
          :type="state.showPassword ? 'text' : 'password'"
          outlined
          dense
          :rules="[(val) => !!val || $t('cloud.passwordRequired')]"
          :disable="state.isLoading"
          @keyup.enter="methods.submit"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-lock" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="state.showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              class="cursor-pointer"
              @click="state.showPassword = !state.showPassword"
            />
          </template>
        </q-input>

        <q-banner v-if="state.error" class="bg-danger text-text-invert" rounded dense>
          <template v-slot:avatar>
            <q-icon name="mdi-alert-circle" />
          </template>
          {{ state.error }}
        </q-banner>
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent } from 'quasar';
import { useCloud } from 'src/composables/use-cloud';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'CloudLoginDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const cloud = useCloud();

    const state = reactive({
      email: '',
      password: '',
      showPassword: false,
      isLoading: false,
      error: null as string | null,
    });

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const methods = {
      async submit() {
        if (!state.email || !state.password) return;
        state.isLoading = true;
        state.error = null;
        try {
          const result = await cloud.methods.login(state.email, state.password);
          if (result.success) {
            onDialogOK();
          } else {
            state.error = result.error || t('cloud.invalidCredentials');
          }
        } catch {
          state.error = t('cloud.connectionError');
        } finally {
          state.isLoading = false;
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      state,
      methods,
      isValidEmail,
    };
  },
});
</script>
