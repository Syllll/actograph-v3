<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('dialogs.saveAs.title')"
      size="sm"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('dialogs.saveAs.submit')"
      :submitDisable="!isValid"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <div class="column q-gutter-md">
        <q-input
          v-model="state.newName"
          :placeholder="$t('dialogs.saveAs.namePlaceholder')"
          outlined
          dense
          :rules="[(val) => (val && val.trim().length > 0) || $t('dialogs.saveAs.nameRequired')]"
          @keyup.enter="onOKClick"
        />
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'SaveAsDialog',
  components: { DDialogCard },
  props: {
    currentName: { type: String, default: '' },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      newName: props.currentName
        ? `${props.currentName} (${t('dialogs.saveAs.copySuffix')})`
        : '',
    });

    const isValid = computed(() => {
      return state.newName && state.newName.trim().length > 0;
    });

    const onOKClick = () => {
      if (isValid.value) {
        onDialogOK(state.newName.trim());
      }
    };

    return {
      dialogRef,
      onDialogHide,
      state,
      isValid,
      onOKClick,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>
