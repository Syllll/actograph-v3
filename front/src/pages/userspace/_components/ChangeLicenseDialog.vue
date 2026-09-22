<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('drawer.changeLicenseTitle')"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('drawer.changeLicenseConfirm')"
      :cancelDisable="state.submitting"
      :submitLoading="state.submitting"
      @cancel="onCancelClick"
      @submit="methods.onConfirm"
    >
      <div class="text-body2 text-grey-8">
        {{ $t('drawer.changeLicenseMessage') }}
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DDialogCard } from '@lib-improba/components';
import securityService from '@services/security/index.service';
import { useLicense } from 'src/composables/use-license';

export default defineComponent({
  name: 'ChangeLicenseDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const { t } = useI18n();
    const license = useLicense();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      submitting: false,
    });

    const methods = {
      onConfirm: async () => {
        if (state.submitting) {
          return;
        }

        state.submitting = true;
        try {
          await securityService.resetElectronAccess();
          license.methods.clearAccess();
          onDialogOK();
          await router.replace({ name: 'gateway_choose-version' });
        } catch (error) {
          console.error('Error resetting license access:', error);
          $q.notify({
            type: 'negative',
            message: t('drawer.changeLicenseError'),
          });
        } finally {
          state.submitting = false;
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      state,
      methods,
    };
  },
});
</script>
