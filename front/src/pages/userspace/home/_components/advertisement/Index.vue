<template>
  <div class="advertisement fit column">
    <q-scroll-area class="col">
      <div class="column">
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
import { defineComponent, computed } from 'vue';
import { useLicense } from 'src/composables/use-license';
import { LicenseTypeEnum } from '@services/security/interface';

export default defineComponent({
  name: 'Advertisement',
  setup() {
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

    return {
      stateless,
      license,
      licenseName,
      licenseDescription,
    };
  },
});
</script>

<style lang="scss" scoped>
.advertisement {
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

