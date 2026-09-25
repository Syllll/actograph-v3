<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('cloud.disconnectTitle')"
      size="sm"
      :cancelLabel="$t('cloud.disconnectCancel')"
      :submitLabel="$t('cloud.disconnectConfirm')"
      :cancelDisable="state.submitting"
      :submitLoading="state.submitting"
      @cancel="onCancelClick"
      @submit="methods.onConfirm"
    >
      <div class="text-body2 text-grey-8">
        {{ $t('cloud.disconnectMessage') }}
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard } from '@lib-improba/components';
import { useCloud } from 'src/composables/use-cloud';

export default defineComponent({
  name: 'CloudDisconnectDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const cloud = useCloud();
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
          await cloud.methods.logout();
          onDialogOK();
        } catch (error) {
          console.error('Cloud logout failed:', error);
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
