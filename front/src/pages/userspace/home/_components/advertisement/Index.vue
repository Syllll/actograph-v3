<template>
  <div class="advertisement fit column">
    <q-scroll-area class="col">
      <div class="column">
        <!-- Version du logiciel -->
        <div class="version-card q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            {{ $t('licenseUi.version') }}
          </div>
          <div class="text-body1">
            ActoGraph v{{ stateless.appVersion }}
          </div>
        </div>

        <!-- Votre licence -->
        <div class="license-card q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            {{ $t('licenseUi.yourLicense') }}
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
            {{ $t('licenseUi.aboutTitle') }}
          </div>
          <div class="text-body2 text-grey-8">
            {{ $t('licenseUi.aboutBody1') }}
          </div>
          <div class="text-body2 text-grey-8 q-mt-sm">
            {{ $t('licenseUi.aboutBody2') }}
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLicense } from 'src/composables/use-license';
import { LicenseTypeEnum } from '@services/security/interface';

export default defineComponent({
  name: 'Advertisement',
  setup() {
    const license = useLicense();
    const { t, locale } = useI18n();

    const stateless = {
      appVersion: process.env.APP_VERSION,
    };

    const licenseName = computed(() => {
      void locale.value;
      if (!license.sharedState.license) {
        return t('licenseUi.typeStudentAccess');
      }
      const type = license.sharedState.license.type;
      switch (type) {
        case LicenseTypeEnum.Ultimate:
          return t('licenseUi.typeUltimate');
        case LicenseTypeEnum.Support:
          return t('licenseUi.typeSupport');
        case LicenseTypeEnum.Student:
          return t('licenseUi.typeStudentAccess');
        default:
          return t('licenseUi.typeProfessionalDefault');
      }
    });

    const licenseDescription = computed(() => {
      void locale.value;
      if (!license.sharedState.license) {
        return t('licenseUi.descStudentDefault');
      }
      const type = license.sharedState.license.type;
      switch (type) {
        case LicenseTypeEnum.Ultimate:
          return t('licenseUi.descUltimate');
        case LicenseTypeEnum.Support:
          return t('licenseUi.descSupport');
        case LicenseTypeEnum.Student:
          return t('licenseUi.descStudent');
        default:
          return t('licenseUi.descProfessional');
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

