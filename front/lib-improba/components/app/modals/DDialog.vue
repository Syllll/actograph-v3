<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="title"
      :icon="icon"
      :size="size"
      :useInnerPadding="useInnerPadding"
      :cancelLabel="cancelLabel"
      :cancelDisable="cancelDisable"
      :submitLabel="submitLabel"
      :submitDisable="submitDisable"
      :submitLoading="submitLoading"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <slot />

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>

      <template v-if="$slots['inner-header-actions']" #inner-header-actions>
        <slot name="inner-header-actions" />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import DDialogCard from './DDialogCard.vue';

export default defineComponent({
  name: 'DDialog',
  components: { DDialogCard },
  props: {
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    size: { type: String, default: 'sm' },
    width: { type: String, default: undefined },
    maxHeight: { type: String, default: undefined },
    bgColor: { type: String, default: 'background' },
    useInnerPadding: { type: Boolean, default: true },
    cancelLabel: { type: String, default: undefined },
    cancelDisable: { type: Boolean, default: false },
    submitLabel: { type: String, default: undefined },
    submitDisable: { type: Boolean, default: false },
    submitLoading: { type: Boolean, default: false },
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    return {
      dialogRef,
      onDialogHide,
      onOKClick: onDialogOK,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>
