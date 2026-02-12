<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 500px; max-width: 700px"
      bgColor="background"
      innerHeader
      :title="$t('help.title')"
    >
      <DCardSection>
        <q-tabs
          v-model="state.tab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="guide" :label="$t('help.tabGuide')" />
          <q-tab name="links" :label="$t('help.tabLinks')" />
          <q-tab name="about" :label="$t('help.tabAbout')" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="state.tab" animated>
          <q-tab-panel name="guide">
            <div class="column q-gutter-md q-pa-sm">
              <div
                v-for="(step, i) in steps"
                :key="i"
                class="row items-start q-gutter-sm"
              >
                <q-avatar
                  size="28px"
                  color="primary"
                  text-color="white"
                  class="col-auto"
                >
                  {{ i + 1 }}
                </q-avatar>
                <div class="col">
                  <div class="text-weight-bold">{{ step.title }}</div>
                  <div class="text-body2 text-grey-7">{{ step.description }}</div>
                </div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="links">
            <div class="column q-gutter-sm q-pa-sm">
              <q-item
                v-for="(link, i) in usefulLinks"
                :key="i"
                clickable
                v-ripple
                @click="methods.openExternalLink(link.url)"
                class="help-link"
              >
                <q-item-section avatar>
                  <q-icon :name="link.icon" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ link.label }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="open_in_new" size="xs" color="primary" />
                </q-item-section>
              </q-item>
            </div>
          </q-tab-panel>
          <q-tab-panel name="about">
            <div class="column q-gutter-md q-pa-sm">
              <div class="text-body1">{{ appVersion }}</div>
              <q-separator />
              <div class="text-subtitle2 text-weight-medium">{{ $t('help.shortcuts') }}</div>
              <div class="text-caption text-grey-7">{{ $t('help.shortcutsEmpty') }}</div>
              <q-separator />
              <div class="text-caption text-grey-7">{{ $t('help.credits') }}</div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </DCardSection>
      <DCardSection>
        <div class="row justify-end">
          <q-btn flat :label="$t('help.close')" color="primary" @click="onCancelClick" />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import {
  DCard,
  DCardSection,
} from '@lib-improba/components';
export default defineComponent({
  name: 'HelpDialog',
  components: {
    DCard,
    DCardSection,
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();

    const state = reactive({
      tab: 'guide' as 'guide' | 'links' | 'about',
    });

    const steps = [
      {
        title: 'Créer une chronique',
        description:
          "Depuis l'accueil, créez une nouvelle chronique (in situ ou vidéo).",
      },
      {
        title: 'Définir le protocole',
        description:
          "Ajoutez des catégories et observables dans l'onglet Protocole.",
      },
      {
        title: 'Observer',
        description:
          "Lancez l'enregistrement et cliquez sur les boutons d'observables.",
      },
      {
        title: 'Analyser',
        description:
          "Consultez le graphe d'activité et les statistiques.",
      },
    ];

    const usefulLinks = [
      {
        label: 'Didacticiel "Premiers pas"',
        url: 'https://www.actograph.io/web/fr/software/description',
        icon: 'mdi-book-open-variant',
      },
      {
        label: 'Documentation',
        url: 'https://www.actograph.io/web/fr/software/install',
        icon: 'mdi-file-document-outline',
      },
      {
        label: 'Tutoriels',
        url: 'https://www.actograph.io/web/fr/software/tutorial',
        icon: 'mdi-school-outline',
      },
      {
        label: 'FAQ',
        url: 'https://www.actograph.io/web/fr/faq',
        icon: 'mdi-help-circle-outline',
      },
      {
        label: 'Site ActoGraph.io',
        url: 'https://www.actograph.io',
        icon: 'mdi-web',
      },
      {
        label: 'Contact',
        url: 'https://www.actograph.io/web/fr/contact',
        icon: 'mdi-email-outline',
      },
    ];

    const appVersion = computed(
      () =>
        `ActoGraph V3 — v${process.env.APP_VERSION ?? '0.0.0'}`
    );

    const onCancelClick = () => {
      onDialogCancel();
    };

    const methods = {
      openExternalLink: (url: string) => {
        if (window.api && window.api.openExternal) {
          window.api.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick,
      state,
      steps,
      usefulLinks,
      appVersion,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.help-link {
  border-radius: 0.25rem;
  padding: 0.5rem;
  min-height: auto;

  &:hover {
    background-color: rgba(31, 41, 55, 0.1);
  }
}
</style>
