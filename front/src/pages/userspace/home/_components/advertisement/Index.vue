<template>
  <div class="advertisement fit column">
    <q-scroll-area class="col">
      <div class="column">
        <!-- Cloud ActoGraph -->
        <div class="cloud-card q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="mdi-cloud" class="q-mr-xs" />
            Cloud ActoGraph
          </div>
          <div class="text-body2 text-grey-8 q-mb-md">
            Synchronisez vos chroniques entre vos appareils via le cloud actograph.io.
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn
              color="primary"
              :icon="cloud.sharedState.isAuthenticated ? 'mdi-cloud-sync' : 'mdi-cloud-upload'"
              :label="cloud.sharedState.isAuthenticated ? 'Gérer le cloud' : 'Se connecter'"
              @click="methods.openCloud"
              no-caps
              outline
            />
            <span v-if="cloud.sharedState.isAuthenticated" class="text-caption text-grey-7">
              {{ cloud.sharedState.currentEmail }}
            </span>
          </div>
        </div>

        <!-- Version du logiciel -->
        <div class="version-card q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            Version
          </div>
          <div class="text-body1">
            ActoGraph v{{ stateless.appVersion }}
          </div>
        </div>

        <!-- Votre licence -->
        <div class="license-card q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            Votre licence
          </div>
          <div class="text-body1 text-weight-medium q-mb-xs">
            {{ licenseName }}
          </div>
          <div class="text-body2 text-grey-8">
            {{ licenseDescription }}
          </div>
        </div>

        <!-- Introduction ActoGraph -->
        <div class="intro-card q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            À propos d'ActoGraph
          </div>
          <div class="text-body2 text-grey-8">
            ActoGraph est un logiciel d'analyse et de visualisation de données d'observation comportementale. 
            Il permet de créer des observations, de collecter des données structurées et de visualiser vos résultats 
            sous forme de graphiques interactifs.
          </div>
          <div class="text-body2 text-grey-8 q-mt-sm">
            Le code source d'ActoGraph est open-source, mais l'usage en entreprise doit faire l'objet d'une licence professionnelle.
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useLicense } from 'src/composables/use-license';
import { useCloud } from 'src/composables/use-cloud';
import { LicenseTypeEnum } from '@services/security/interface';
import CloudLoginDialog from '../cloud/CloudLoginDialog.vue';
import CloudSyncDialog from '../cloud/CloudSyncDialog.vue';

export default defineComponent({
  name: 'Advertisement',
  setup() {
    const $q = useQuasar();
    const license = useLicense();
    const cloud = useCloud();

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
      openCloud: async () => {
        // Initialiser le cloud si nécessaire
        await cloud.methods.init();

        if (!cloud.sharedState.isAuthenticated) {
          // Ouvrir le dialog de login
          $q.dialog({
            component: CloudLoginDialog,
          }).onOk(() => {
            // Connexion réussie, ouvrir le dialog de sync
            methods.openCloudSyncDialog();
          });
        } else {
          // Déjà connecté, ouvrir directement le dialog de sync
          methods.openCloudSyncDialog();
        }
      },

      openCloudSyncDialog: () => {
        $q.dialog({
          component: CloudSyncDialog,
        }).onOk((result: { action: string; observationId?: number }) => {
          if (result.action === 'logout') {
            // Utilisateur déconnecté, réouvrir le login
            methods.openCloud();
          }
          // Si result.action === 'downloaded', l'observation a été chargée dans le dialog
        });
      },
    };

    // Initialiser le cloud au montage pour afficher l'état de connexion
    onMounted(async () => {
      await cloud.methods.init();
    });

    return {
      stateless,
      license,
      licenseName,
      licenseDescription,
      cloud,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.advertisement {
  .cloud-card {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .version-card {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .license-card {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .intro-card {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }
}
</style>

