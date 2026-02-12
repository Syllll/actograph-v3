<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      :title="$t('preferences.title')"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <!-- Langue -->
          <div class="column q-gutter-sm">
            <div class="text-subtitle2 text-weight-medium">{{ $t('preferences.language') }}</div>
            <q-btn-toggle
              v-model="state.locale"
              :options="localeOptions"
              spread
              no-caps
              toggle-color="primary"
              :color="$q.dark.isActive ? 'white' : 'grey-3'"
              @update:model-value="methods.onLocaleChange"
            />
          </div>

          <q-separator />

          <!-- Thème -->
          <div class="column q-gutter-sm">
            <div class="text-subtitle2 text-weight-medium">{{ $t('preferences.theme') }}</div>
            <q-toggle
              v-model="state.darkMode"
              :label="$t('preferences.darkMode')"
              color="primary"
              @update:model-value="methods.onThemeChange"
            />
          </div>
        </div>
      </DCardSection>
      <DCardSection>
        <div class="row justify-end">
          <q-btn flat :label="$t('preferences.close')" color="primary" @click="onCancelClick" />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import {
  DCard,
  DCardSection,
} from '@lib-improba/components';
import {
  loadPreferences,
  savePreferences,
} from '@utils/preferences.utils';

export default defineComponent({
  name: 'PreferencesDialog',
  components: {
    DCard,
    DCardSection,
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
    const i18n = useI18n();
    const $q = useQuasar();

    const state = reactive({
      locale: 'fr' as string,
      darkMode: false,
    });

    const localeOptions = [
      { label: 'FR', value: 'fr' },
      { label: 'EN', value: 'en-US' },
    ];

    onMounted(() => {
      try {
        const prefs = loadPreferences();
        state.locale = prefs.locale;
        state.darkMode = prefs.darkMode;
      } catch (e) {
        console.error('Erreur chargement préférences:', e);
      }
    });

    const onCancelClick = () => {
      onDialogCancel();
    };

    const methods = {
      onLocaleChange: (value: string) => {
        try {
          i18n.locale.value = value;
          savePreferences({ locale: value, darkMode: state.darkMode });
        } catch (e) {
          console.error('Erreur sauvegarde préférences:', e);
          $q.notify({ type: 'negative', message: 'Impossible de sauvegarder les préférences' });
        }
      },
      onThemeChange: (value: boolean) => {
        try {
          $q.dark.set(value);
          savePreferences({ locale: state.locale, darkMode: value });
        } catch (e) {
          console.error('Erreur sauvegarde préférences:', e);
          $q.notify({ type: 'negative', message: 'Impossible de sauvegarder les préférences' });
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick,
      state,
      localeOptions,
      methods,
    };
  },
});
</script>
