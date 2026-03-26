<template>
  <DPage>
    <div class="fit column">
      <div class="col-auto q-pa-md">
        <div class="text-h4 text-weight-bold q-mb-md">
          {{ $t('licensePage.pageTitle') }}
        </div>
        <div class="text-body2 text-grey-7">
          {{ $t('licensePage.lastUpdated') }}
        </div>
      </div>
      <DScrollArea class="col">
        <div class="q-pa-lg">
          <div
            class="license-content text-body1"
            v-html="licenseBodyHtml"
          />
        </div>
      </DScrollArea>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DScrollArea } from '@lib-improba/components/app/scroll-areas';
import licenseBodyFr from 'src/i18n/license-body/fr.html?raw';
import licenseBodyEn from 'src/i18n/license-body/en.html?raw';

export default defineComponent({
  name: 'LicensePage',
  components: {
    DScrollArea,
  },
  setup() {
    const { locale } = useI18n();

    const licenseBodyHtml = computed(() =>
      locale.value === 'en-US' ? licenseBodyEn : licenseBodyFr,
    );

    return {
      licenseBodyHtml,
    };
  },
});
</script>

<style lang="scss" scoped>
.license-content {
  max-width: 900px;
  margin: 0 auto;
  line-height: 1.6;

  :deep(ul) {
    list-style-type: disc;
  }

  :deep(li) {
    margin-bottom: 0.5rem;
  }

  :deep(p) {
    margin-bottom: 0.75rem;
  }
}
</style>
