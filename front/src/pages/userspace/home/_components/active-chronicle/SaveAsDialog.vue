<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('dialogs.saveAs.title')"
      size="md"
      :cancelLabel="$t('dialogs.cancel')"
      :submitLabel="$t('dialogs.saveAs.submit')"
      :submitDisable="!isValid"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <div class="column q-gutter-md save-as-body">
        <div v-if="currentName" class="text-body2 text-grey-8">
          {{ $t('dialogs.saveAs.sourceLabel', { name: currentName }) }}
        </div>
        <div class="text-caption text-grey-7">
          {{ $t('dialogs.saveAs.hint') }}
        </div>
        <q-input
          ref="nameInputRef"
          v-model="state.newName"
          :placeholder="$t('dialogs.saveAs.namePlaceholder')"
          outlined
          dense
          autofocus
          maxlength="80"
          counter
          class="save-as-input"
          :rules="[(val) => (val && val.trim().length > 0) || $t('dialogs.saveAs.nameRequired')]"
          @keyup.enter="onOKClick"
        />
      </div>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, onMounted, nextTick } from 'vue';
import type { QInput } from 'quasar';
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

    const nameInputRef = ref<QInput | null>(null);

    const buildDefaultName = (name: string) => {
      const suffix = ` (${t('dialogs.saveAs.copySuffix')})`;
      const maxLength = 80;
      if (name.length + suffix.length <= maxLength) {
        return `${name}${suffix}`;
      }
      return `${name.slice(0, maxLength - suffix.length).trimEnd()}${suffix}`;
    };

    const state = reactive({
      newName: props.currentName ? buildDefaultName(props.currentName) : '',
    });

    onMounted(() => {
      void nextTick(() => {
        nameInputRef.value?.focus();
        nameInputRef.value?.select();
      });
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
      nameInputRef,
      currentName: computed(() => props.currentName),
      state,
      isValid,
      onOKClick,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>

<style scoped lang="scss">
.save-as-body {
  overflow: hidden;
  word-break: break-word;
  min-width: 0;
  max-width: 100%;
}

.save-as-input {
  width: 100%;
}
</style>
