<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <q-card class="readings-confirm-dialog">
      <q-card-section class="q-pb-none">
        <h5 class="readings-confirm-dialog__title q-ma-none">
          {{ title }}
        </h5>
      </q-card-section>
      <q-card-section class="text-body2 text-grey-8">
        {{ message }}
      </q-card-section>
      <q-card-actions align="right" class="q-gutter-md q-px-md q-pb-md">
        <q-btn
          flat
          unelevated
          no-caps
          rounded
          :label="t('dialogs.cancel')"
          @click="onCancelClick"
        />
        <q-btn
          unelevated
          no-caps
          rounded
          :color="destructive ? 'negative' : 'accent'"
          text-color="white"
          :label="okLabel"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'ReadingsConfirmDialog',
  props: {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    okLabel: {
      type: String,
      required: true,
    },
    destructive: {
      type: Boolean,
      default: false,
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    return {
      t,
      dialogRef,
      onDialogHide,
      onOKClick: () => onDialogOK(true),
      onCancelClick: onDialogCancel,
    };
  },
});
</script>

<style scoped lang="scss">
.readings-confirm-dialog {
  min-width: min(400px, calc(100vw - 48px));
  max-width: min(90vw, calc(100vw - 48px));
  border: 1px solid var(--neutral-low);
  border-radius: 12px;
  box-shadow: 0 16px 36px var(--neutral-high-20);
  overflow: hidden;
}

.readings-confirm-dialog__title {
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
