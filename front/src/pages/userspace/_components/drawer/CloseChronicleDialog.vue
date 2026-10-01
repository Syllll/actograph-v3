<template>
  <q-dialog
    ref="dialogRef"
    persistent
    class="actograph-dialog"
    @hide="onDialogHide"
  >
    <DDialogCard
      :title="$t('chronicle.closeActiveTitle')"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('chronicle.closeActiveConfirm')"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <div class="text-body2 text-grey-8">
        {{ $t('chronicle.closeActiveMessage', { name: chronicleName }) }}
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'CloseChronicleDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  props: {
    chronicleName: {
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
