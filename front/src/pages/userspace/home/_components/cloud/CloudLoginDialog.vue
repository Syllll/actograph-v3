<template>
  <q-dialog
    ref="dialogRef"
    class="actograph-dialog cloud-login-dialog"
    :class="{ 'cloud-login-dialog--reset': state.resetFlowActive }"
    @hide="onDialogClosed"
    persistent
  >
    <DDialogCard
      :title="$t('cloud.loginTitle')"
      icon="mdi-cloud"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="
        state.resetFlowActive ? $t('auth.applyNewPassword') : $t('cloud.signIn')
      "
      :cancelDisable="state.isLoading"
      :submitDisable="submitDisabled"
      :submitLoading="state.isLoading"
      @cancel="onCancelClick"
      @submit="methods.handlePrimaryAction"
    >
      <div v-if="!state.resetFlowActive" class="column q-gutter-xs q-mb-md">
        <div class="text-caption text-neutral-high">
          {{ $t('cloud.loginIntro') }}
        </div>
        <div class="text-caption text-neutral-high">
          {{ $t('cloud.legacyAccountsHint') }}
        </div>
      </div>

      <div class="column q-gutter-md">
        <q-input
          v-if="!state.resetFlowActive"
          v-model="state.email"
          :placeholder="$t('cloud.identifier')"
          type="text"
          autocomplete="username"
          outlined
          dense
          autofocus
          :rules="[validateRequired]"
          :disable="state.isLoading"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-account" />
          </template>
        </q-input>

        <div v-if="!state.resetFlowActive" class="column cloud-login-dialog__password-block">
          <q-input
            v-model="state.password"
            :placeholder="$t('cloud.password')"
            :type="state.showPassword ? 'text' : 'password'"
            outlined
            dense
            hide-bottom-space
            :rules="[validatePasswordRequired]"
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

          <div class="row justify-end cloud-login-dialog__forgot-row">
            <span
              class="cloud-login-dialog__forgot-wrap"
              :class="{ 'cloud-login-dialog__forgot-wrap--identifier-hint': forgotIdentifierTooltip }"
            >
              <q-btn
                flat
                dense
                no-caps
                color="accent"
                :label="$t('cloud.forgotLink')"
                :disable="forgotLinkDisabled"
                @click="methods.requestForgot"
              />
              <q-tooltip v-if="forgotIdentifierTooltip">
                {{ forgotIdentifierTooltip }}
              </q-tooltip>
            </span>
          </div>
        </div>

        <q-banner
          v-if="state.infoMessage"
          class="bg-secondary-medium text-neutral-high"
          rounded
          dense
        >
          {{ state.infoMessage }}
        </q-banner>

        <template v-if="state.resetFlowActive">
          <q-input
            v-model="state.resetLink"
            :label="$t('cloud.forgotLinkLabel')"
            type="text"
            autocomplete="off"
            outlined
            dense
            autofocus
            :rules="[validateResetLinkRequired]"
            :disable="state.isLoading"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-link-variant" />
            </template>
          </q-input>

          <q-input
            v-model="state.newPassword"
            :placeholder="$t('cloud.newPassword')"
            :type="state.showNewPassword ? 'text' : 'password'"
            autocomplete="new-password"
            outlined
            dense
            :rules="[validateNewPasswordLength]"
            :disable="state.isLoading"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="state.showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @click="state.showNewPassword = !state.showNewPassword"
              />
            </template>
          </q-input>

          <q-input
            v-model="state.newPasswordConfirm"
            :placeholder="$t('cloud.newPasswordConfirm')"
            :type="state.showNewPasswordConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            outlined
            dense
            :rules="[validateNewPasswordLength, validatePasswordMatch]"
            :disable="state.isLoading"
            @keyup.enter="methods.submitReset"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-lock-check" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="state.showNewPasswordConfirm ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @click="state.showNewPasswordConfirm = !state.showNewPasswordConfirm"
              />
            </template>
          </q-input>
        </template>

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
import { defineComponent, reactive, computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent } from 'quasar';
import { useCloud } from 'src/composables/use-cloud';
import { isCloudLoginIdentifierFilled } from 'src/utils/cloud-login-identifier';
import { extractCloudResetToken } from 'src/utils/cloud-reset-token';
import { actographAuthService } from '@services/cloud/actograph-auth.service';
import { DDialogCard } from '@lib-improba/components';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const FORGOT_COOLDOWN_SECONDS = 90;

export default defineComponent({
  name: 'CloudLoginDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const cloud = useCloud();

    let forgotCooldownTimer: ReturnType<typeof setInterval> | null = null;

    const state = reactive({
      email: '',
      password: '',
      showPassword: false,
      resetFlowActive: false,
      resetLink: '',
      newPassword: '',
      newPasswordConfirm: '',
      showNewPassword: false,
      showNewPasswordConfirm: false,
      forgotCooldownRemaining: 0,
      isLoading: false,
      error: null as string | null,
      infoMessage: null as string | null,
    });

    const loginSubmitDisabled = computed(
      () => !isCloudLoginIdentifierFilled(state.email) || !state.password,
    );

    const resetSubmitDisabled = computed(() => {
      const password = state.newPassword;
      const confirmation = state.newPasswordConfirm;
      if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
        return true;
      }
      if (password !== confirmation) {
        return true;
      }
      if (!state.resetLink.trim()) {
        return true;
      }
      return false;
    });

    const submitDisabled = computed(() =>
      state.resetFlowActive ? resetSubmitDisabled.value : loginSubmitDisabled.value,
    );

    const forgotLinkDisabled = computed(
      () =>
        !isCloudLoginIdentifierFilled(state.email) ||
        state.forgotCooldownRemaining > 0 ||
        state.isLoading,
    );

    const forgotIdentifierTooltip = computed(() =>
      isCloudLoginIdentifierFilled(state.email) ? undefined : t('cloud.identifierRequired'),
    );

    const validateRequired = (val: string | null | undefined): boolean | string =>
      isCloudLoginIdentifierFilled(val) || t('cloud.identifierRequired');

    const validatePasswordRequired = (val: string | null | undefined): boolean | string =>
      Boolean(val) || t('cloud.passwordRequired');

    const validateResetLinkRequired = (val: string | null | undefined): boolean | string =>
      Boolean(val && val.trim()) || t('cloud.forgotLinkRequired');

    const validateNewPasswordLength = (val: string | null | undefined): boolean | string => {
      const length = val?.length ?? 0;
      if (length === 0) {
        return true;
      }
      if (length < PASSWORD_MIN_LENGTH) {
        return t('cloud.passwordTooShort');
      }
      if (length > PASSWORD_MAX_LENGTH) {
        return t('cloud.passwordTooLong');
      }
      return true;
    };

    const validatePasswordMatch = (val: string | null | undefined): boolean | string =>
      val === state.newPassword || t('cloud.passwordMismatch');

    const clearForgotCooldownTimer = () => {
      if (forgotCooldownTimer) {
        clearInterval(forgotCooldownTimer);
        forgotCooldownTimer = null;
      }
    };

    const startForgotCooldown = () => {
      clearForgotCooldownTimer();
      state.forgotCooldownRemaining = FORGOT_COOLDOWN_SECONDS;
      forgotCooldownTimer = setInterval(() => {
        state.forgotCooldownRemaining -= 1;
        if (state.forgotCooldownRemaining <= 0) {
          clearForgotCooldownTimer();
          state.forgotCooldownRemaining = 0;
        }
      }, 1000);
    };

    const clearResetFields = () => {
      state.resetLink = '';
      state.newPassword = '';
      state.newPasswordConfirm = '';
    };

    const resetDialogState = () => {
      clearForgotCooldownTimer();
      state.email = '';
      state.password = '';
      state.showPassword = false;
      state.resetFlowActive = false;
      clearResetFields();
      state.showNewPassword = false;
      state.showNewPasswordConfirm = false;
      state.forgotCooldownRemaining = 0;
      state.isLoading = false;
      state.error = null;
      state.infoMessage = null;
    };

    const methods = {
      handlePrimaryAction() {
        if (state.resetFlowActive) {
          if (resetSubmitDisabled.value) return;
          void methods.submitReset();
        } else {
          if (loginSubmitDisabled.value) return;
          void methods.submit();
        }
      },

      async submit() {
        if (loginSubmitDisabled.value) return;
        state.isLoading = true;
        state.error = null;
        try {
          const result = await cloud.methods.login(state.email.trim(), state.password);
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

      async requestForgot() {
        if (forgotLinkDisabled.value) return;
        state.isLoading = true;
        state.error = null;
        state.infoMessage = null;
        try {
          const result = await actographAuthService.requestForgotPassword(state.email.trim());
          if (!result.success) {
            state.error = t('cloud.forgotSendFailed');
            return;
          }
          state.resetFlowActive = true;
          state.infoMessage = t('cloud.forgotSent');
          startForgotCooldown();
        } finally {
          state.isLoading = false;
        }
      },

      async submitReset() {
        if (resetSubmitDisabled.value) return;

        const token = extractCloudResetToken(state.resetLink);
        if (!token) {
          state.error = t('cloud.forgotLinkInvalid');
          return;
        }

        state.isLoading = true;
        state.error = null;

        const password = state.newPassword;

        try {
          const result = await actographAuthService.resetPassword(token, password);
          if (result.success) {
            clearResetFields();
            state.resetFlowActive = false;
            state.password = '';
            state.infoMessage = t('cloud.resetDone');
          } else {
            state.error = t('cloud.resetFailed');
          }
        } catch {
          state.error = t('cloud.resetFailed');
        } finally {
          state.isLoading = false;
        }
      },
    };

    onBeforeUnmount(() => {
      clearForgotCooldownTimer();
    });

    const onDialogClosed = () => {
      resetDialogState();
      onDialogHide();
    };

    return {
      dialogRef,
      onDialogClosed,
      onCancelClick: onDialogCancel,
      state,
      methods,
      loginSubmitDisabled,
      resetSubmitDisabled,
      submitDisabled,
      forgotLinkDisabled,
      forgotIdentifierTooltip,
      validateRequired,
      validatePasswordRequired,
      validateResetLinkRequired,
      validateNewPasswordLength,
      validatePasswordMatch,
    };
  },
});
</script>

<style lang="scss" scoped>
// Reset step: width sized for footer (Annuler + long FR label) + banner text, not generic md.
.cloud-login-dialog--reset :deep(.d-dialog-card.d-dialog-card--sm) {
  width: min(500px, calc(100vw - 48px));
  min-width: min(500px, calc(100vw - 48px));
  max-width: min(500px, calc(100vw - 48px));
}

.cloud-login-dialog__password-block {
  gap: 0;
}

.cloud-login-dialog__forgot-row {
  margin-top: 2px;
}

.cloud-login-dialog__forgot-wrap {
  display: inline-block;
}

.cloud-login-dialog__forgot-wrap--identifier-hint {
  cursor: help;

  :deep(.q-btn.disabled) {
    cursor: help !important;
    pointer-events: none;
  }
}

.cloud-login-dialog :deep(.d-dialog-card__footer .q-btn) {
  white-space: nowrap;
}
</style>
