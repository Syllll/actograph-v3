<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <q-card class="terminate-observation-dialog">
      <q-card-section class="q-pb-none">
        <h5 class="terminate-observation-dialog__title q-ma-none">
          {{ $t('observation.terminateConfirmTitle') }}
        </h5>
      </q-card-section>
      <q-card-section class="text-body2 text-grey-8">
        {{ $t('observation.terminateConfirmMessage') }}
      </q-card-section>
      <q-card-actions align="right" class="q-gutter-md q-px-md q-pb-md">
        <q-btn
          flat
          unelevated
          no-caps
          rounded
          :label="$t('dialogs.cancel')"
          @click="onCancelClick"
        />
        <q-btn
          unelevated
          no-caps
          rounded
          color="accent"
          text-color="white"
          :label="$t('observation.sessionTerminer')"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';

export default defineComponent({
  name: 'TerminateObservationDialog',
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    return {
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      onOKClick: () => onDialogOK(true),
    };
  },
});
</script>

<style scoped lang="scss">
.terminate-observation-dialog {
  min-width: min(400px, calc(100vw - 48px));
  max-width: min(90vw, calc(100vw - 48px));
  border: 1px solid var(--neutral-low);
  border-radius: 12px;
  box-shadow: 0 16px 36px var(--neutral-high-20);
  overflow: hidden;
}

.terminate-observation-dialog__title {
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
