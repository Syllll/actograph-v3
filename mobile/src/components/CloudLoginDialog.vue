<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="cloud-login-dialog" style="min-width: 320px">
      <q-card-section class="bg-primary text-white">
        <div class="row items-center">
          <q-icon name="mdi-cloud" size="24px" class="q-mr-sm" />
          <div class="text-h6">Connexion au Cloud</div>
        </div>
        <div class="text-caption q-mt-xs">actograph.io</div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form @submit.prevent="methods.submit" class="column q-gutter-md">
          <q-input
            v-model="state.email"
            label="Email"
            type="email"
            outlined
            dense
            autofocus
            :rules="[(val) => !!val || 'Email requis', (val) => isValidEmail(val) || 'Email invalide']"
            :disable="state.isLoading"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-email" />
            </template>
          </q-input>

          <q-input
            v-model="state.password"
            label="Mot de passe"
            :type="state.showPassword ? 'text' : 'password'"
            outlined
            dense
            :rules="[(val) => !!val || 'Mot de passe requis']"
            :disable="state.isLoading"
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

          <q-banner v-if="state.error" class="bg-negative text-white" rounded dense>
            <template v-slot:avatar>
              <q-icon name="mdi-alert-circle" />
            </template>
            {{ state.error }}
          </q-banner>
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Annuler" color="grey-7" @click="onCancelClick" :disable="state.isLoading" />
        <q-btn
          color="primary"
          label="Se connecter"
          unelevated
          @click="methods.submit"
          :loading="state.isLoading"
          :disable="!state.email || !state.password"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useCloud } from '@composables/use-cloud';

export default defineComponent({
  name: 'CloudLoginDialog',
  emits: [...useDialogPluginComponent.emits],
  setup() {
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
            state.error = result.error || 'Identifiants invalides';
          }
        } catch (error) {
          state.error = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } finally {
          state.isLoading = false;
        }
      },
    };

    const onCancelClick = () => {
      onDialogCancel();
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick,
      state,
      methods,
      isValidEmail,
    };
  },
});
</script>

<style scoped lang="scss">
.cloud-login-dialog {
  border-radius: 12px;
  overflow: hidden;
}
</style>
