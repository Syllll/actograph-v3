<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('preferences.title')"
      size="sm"
      :cancelLabel="$t('preferences.close')"
      @cancel="onCancelClick"
    >
      <div class="column q-gutter-md">
        <div class="column q-gutter-sm">
          <div class="text-subtitle2 text-weight-medium">{{ $t('preferences.language') }}</div>
          <q-btn-toggle
            v-model="state.locale"
            :options="localeOptions"
            spread
            no-caps
            toggle-color="accent"
            toggle-text-color="white"
            :color="$q.dark.isActive ? 'grey-8' : 'grey-3'"
            :text-color="$q.dark.isActive ? 'white' : 'grey-8'"
            @update:model-value="methods.onLocaleChange"
          />
        </div>

        <q-separator />

        <div class="column q-gutter-sm">
          <div class="text-subtitle2 text-weight-medium">{{ $t('preferences.theme') }}</div>
          <q-toggle
            v-model="state.darkMode"
            :label="$t('preferences.darkMode')"
            color="accent"
            @update:model-value="methods.onThemeChange"
          />
        </div>
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DDialogCard } from '@lib-improba/components';
import {
  loadPreferences,
  savePreferences,
} from '@utils/preferences.utils';

export default defineComponent({
  name: 'PreferencesDialog',
  components: { DDialogCard },
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

    const methods = {
      onLocaleChange: (value: string) => {
        try {
          i18n.locale.value = value;
          savePreferences({ locale: value, darkMode: state.darkMode });
        } catch (e) {
          console.error('Erreur sauvegarde préférences:', e);
          $q.notify({ type: 'negative', message: i18n.t('preferences.saveFailed') });
        }
      },
      onThemeChange: (value: boolean) => {
        try {
          $q.dark.set(value);
          savePreferences({ locale: state.locale, darkMode: value });
        } catch (e) {
          console.error('Erreur sauvegarde préférences:', e);
          $q.notify({ type: 'negative', message: i18n.t('preferences.saveFailed') });
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      state,
      localeOptions,
      methods,
    };
  },
});
</script>
