<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Connexion au Cloud"
      icon="mdi-cloud"
    >
      <DCardSection>
        <div class="text-caption text-grey-7 q-mb-md">
          Connectez-vous à votre compte actograph.io pour synchroniser vos chroniques.
        </div>
        
        <div class="column q-gutter-md">
          <q-input
            v-model="state.email"
            placeholder="Email"
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
            placeholder="Mot de passe"
            :type="state.showPassword ? 'text' : 'password'"
            outlined
            dense
            :rules="[(val) => !!val || 'Mot de passe requis']"
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

          <q-banner v-if="state.error" class="bg-negative text-white" rounded dense>
            <template v-slot:avatar>
              <q-icon name="mdi-alert-circle" />
            </template>
            {{ state.error }}
          </q-banner>
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" :disable="state.isLoading" />
          <DSubmitBtn
            label="Se connecter"
            @click="methods.submit"
            :loading="state.isLoading"
            :disable="!state.email || !state.password"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useCloud } from 'src/composables/use-cloud';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'CloudLoginDialog',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
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
