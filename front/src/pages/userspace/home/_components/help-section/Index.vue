<template>
  <div class="help-section fit column">
    <q-scroll-area class="col">
      <div class="column q-gutter-md q-pa-md">
        <!-- Section : Démarrage rapide -->
        <div class="section-card quick-start-section">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Démarrage rapide
          </div>
          <div class="row justify-center">
            <DSubmitBtn
              label="Charger l'exemple"
              @click="methods.cloneAndLoadExampleObservation()"
            />
          </div>
        </div>

        <!-- Section : Documentation et aide -->
        <div class="section-card">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Documentation
          </div>
          <div class="column q-gutter-sm">
            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/description')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-book-open-variant" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Didacticiel "Premiers pas"</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/install')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-file-document-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Documentation</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/tutorial')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-school-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Tutoriels</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/faq')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-help-circle-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>FAQ</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>
          </div>
        </div>

        <!-- Section : Informations sur le logiciel -->
        <div class="section-card">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
            Informations
          </div>
          <div class="column q-gutter-md">
            <!-- Version -->
            <div class="info-item">
              <div class="text-body2 text-weight-medium text-grey-8 q-mb-xs">
                Version
              </div>
              <div class="text-body1">
                ActoGraph v{{ stateless.appVersion }}
              </div>
            </div>

            <!-- Licence -->
            <div class="info-item">
              <div class="text-body2 text-weight-medium text-grey-8 q-mb-xs">
                Votre licence
              </div>
              <div class="text-body1 text-weight-medium q-mb-xs">
                {{ licenseName }}
              </div>
              <div class="text-body2 text-grey-8">
                {{ licenseDescription }}
              </div>
            </div>

            <!-- À propos -->
            <div class="info-item">
              <div class="text-body2 text-weight-medium text-grey-8 q-mb-xs">
                À propos d'ActoGraph
              </div>
              <div class="text-body2 text-grey-8">
                ActoGraph est un logiciel d'analyse et de visualisation de données d'observation comportementale. 
                Il permet de créer des observations, de collecter des données structurées et de visualiser vos résultats 
                sous forme de graphiques interactifs.
              </div>
            </div>

            <!-- Liens externes -->
            <div class="column q-gutter-sm q-mt-sm">
              <q-item
                clickable
                v-ripple
                @click="methods.openExternalLink('https://www.actograph.io')"
                class="help-link"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-web" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Site ActoGraph.io</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="open_in_new" size="xs" color="primary" />
                </q-item-section>
              </q-item>

              <q-item
                clickable
                v-ripple
                @click="methods.openExternalLink('https://www.actograph.io/fr/contact')"
                class="help-link"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-email-outline" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Contact</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="open_in_new" size="xs" color="primary" />
                </q-item-section>
              </q-item>
            </div>
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { useLicense } from 'src/composables/use-license';
import { LicenseTypeEnum } from '@services/security/interface';
import { DSubmitBtn } from '@lib-improba/components';

export default defineComponent({
  name: 'HelpSection',
  components: {
    DSubmitBtn,
  },
  setup() {
    const observation = useObservation();
    const license = useLicense();

    const stateless = {
      appVersion: process.env.APP_VERSION,
    };

    const licenseName = computed(() => {
      if (!license.sharedState.license) {
        return 'Accès étudiant';
      }
      const type = license.sharedState.license.type;
      switch (type) {
        case LicenseTypeEnum.Ultimate:
          return 'Licence Ultimate';
        case LicenseTypeEnum.Support:
          return 'Licence Support';
        case LicenseTypeEnum.Student:
          return 'Accès étudiant';
        default:
          return 'Licence professionnelle';
      }
    });

    const licenseDescription = computed(() => {
      if (!license.sharedState.license) {
        return 'Valable tant que vous êtes étudiant. Cette licence est gratuite et réservée aux étudiants opérant dans un contexte académique.';
      }
      const type = license.sharedState.license.type;
      switch (type) {
        case LicenseTypeEnum.Ultimate:
          return 'Licence complète avec toutes les fonctionnalités avancées et le support prioritaire.';
        case LicenseTypeEnum.Support:
          return 'Licence professionnelle avec support technique et mises à jour.';
        case LicenseTypeEnum.Student:
          return 'Valable tant que vous êtes étudiant. Cette licence est gratuite et réservée aux étudiants opérant dans un contexte académique.';
        default:
          return 'Licence professionnelle pour usage en entreprise.';
      }
    });

    const methods = {
      cloneAndLoadExampleObservation: async () => {
        const exampleObservation =
          await observation.methods.cloneExampleObservation();
        await observation.methods.loadObservation(exampleObservation.id);
      },

      openExternalLink: (url: string) => {
        // Check if we're in Electron environment
        if (window.api && window.api.openExternal) {
          window.api.openExternal(url);
        } else {
          // Fallback for web environment
          window.open(url, '_blank');
        }
      },
    };

    return {
      stateless,
      observation,
      license,
      licenseName,
      licenseDescription,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.help-section {
  .section-card {
    background-color: rgba(31, 41, 55, 0.03);
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .help-link {
    border-radius: 0.25rem;
    padding: 0.5rem;
    min-height: auto;
    
    &:hover {
      background-color: rgba(31, 41, 55, 0.1);
    }
  }

  .info-item {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(31, 41, 55, 0.1);

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
  }
}
</style>

