<template>
  <EmptyLayout>
    <DPage>
      <!-- Userspace language prefs are unreachable until a license is chosen. -->
      <div class="absolute-top-right q-pa-md" style="z-index: 2">
        <q-btn-toggle
          :model-value="state.locale"
          :options="localeOptions"
          no-caps
          toggle-color="accent"
          toggle-text-color="white"
          :color="$q.dark.isActive ? 'grey-8' : 'grey-3'"
          :text-color="$q.dark.isActive ? 'white' : 'grey-8'"
          :aria-label="$t('preferences.language')"
          @update:model-value="methods.onLocaleChange"
        />
      </div>
      <router-view />
    </DPage>
  </EmptyLayout>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import { loadPreferences, savePreferences } from '@utils/preferences.utils';

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    const i18n = useI18n();
    const $q = useQuasar();

    const state = reactive({
      locale: i18n.locale.value,
    });

    const localeOptions = [
      { label: 'FR', value: 'fr' },
      { label: 'EN', value: 'en-US' },
    ];

    const methods = {
      onLocaleChange: (value: string) => {
        try {
          const prefs = loadPreferences();
          i18n.locale.value = value;
          state.locale = value;
          savePreferences({ locale: value, darkMode: prefs.darkMode });
        } catch (e) {
          console.error('Failed to save locale:', e);
          $q.notify({ type: 'negative', message: i18n.t('preferences.saveFailed') });
        }
      },
    };

    return {
      state,
      localeOptions,
      methods,
    };
  },
});
</script>
