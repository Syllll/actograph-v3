<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('observation.switchToModeTitle', { mode: modeLabel })"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('observation.switchModeConfirm')"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <div class="text-body2 text-grey-8">
        {{ $t('observation.switchToModeMessage', { mode: modeLabel }) }}
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'SwitchModeDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  props: {
    modeLabel: {
      type: String,
      required: true,
    },
  },
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
