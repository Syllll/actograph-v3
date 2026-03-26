<template>
  <div class="fit row justify-center items-start q-pt-xl">
    <DCard style="max-width: 60rem">
      <div class="row justify-center items-center">
        <h1>{{ $t('gateway.chooseVersionTitle') }}</h1>
        <p>{{ $t('gateway.chooseVersionSubtitle') }}</p>
      </div>
      <div class="row justify-center q-col-gutter-md">
        <VersionCard
          class="col-6"
          :title="$t('gateway.studentVersionTitle')"
          :subtitle="$t('gateway.studentVersionSubtitle')"
          :description="$t('gateway.studentVersionDescription')"
          :buttonLabel="$t('gateway.studentVersionButton')"
          :loading="loadingStudent"
          @activate="methods.activateStudent"
        />
        <VersionCard
          class="col-6"
          :title="$t('gateway.proVersionTitle')"
          :subtitle="$t('gateway.proVersionSubtitle')"
          :description="$t('gateway.proVersionDescription')"
          :buttonLabel="$t('gateway.proVersionButton')"
          @activate="methods.activatePro"
        />
      </div>
    </DCard>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import VersionCard from './_components/VersionCard.vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuth } from '@lib-improba/composables/use-auth';
import securityService from '@services/security/index.service';

export default defineComponent({
  components: { EmptyLayout, VersionCard },
  setup() {
    const router = useRouter();
    const $q = useQuasar();
    const { t } = useI18n();
    const auth = useAuth(router);

    const loadingStudent = ref(false);

    const methods = {
      activateStudent: async () => {
        loadingStudent.value = true;
        try {
          await securityService.activateStudent();
          router.push({
            name: 'gateway_loading',
          });
        } catch (error) {
          console.error('Error activating student:', error);
          $q.notify({
            type: 'negative',
            message: t('gateway.activateStudentError'),
          });
        } finally {
          loadingStudent.value = false;
        }
      },
      activatePro: () => {
        router.push({ name: 'gateway_activate-pro' });
      },
    };

    return {
      auth,
      loadingStudent,
      methods,
    };
  },
});
</script>
