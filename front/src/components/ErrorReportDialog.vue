<template>
  <q-dialog ref="dialogRef" persistent class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('errorReport.title')"
      size="lg"
      @cancel="onCancelClick"
    >
      <div class="column q-gutter-md">
        <div class="text-body2">{{ $t('errorReport.message') }}</div>
        <q-input
          :model-value="reportText"
          type="textarea"
          readonly
          autogrow
          outlined
          class="error-report-dialog__report"
          input-class="text-monospace text-caption"
        />
        <div v-if="copyFeedback" class="text-caption text-positive">
          {{ copyFeedback }}
        </div>
      </div>
      <template #actions>
        <q-btn
          flat
          :label="$t('errorReport.copy')"
          color="primary"
          @click="methods.copyReport"
        />
        <q-btn
          flat
          :label="$t('errorReport.save')"
          color="primary"
          :disable="!canSave"
          @click="methods.saveReport"
        />
        <q-btn
          flat
          :label="$t('errorReport.close')"
          color="primary"
          @click="onCancelClick"
        />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'ErrorReportDialog',
  components: { DDialogCard },
  props: {
    reportText: {
      type: String,
      required: true,
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t } = useI18n();
    const copyFeedback = ref('');

    const canSave = computed(() => !!window.api?.showSaveDialog && !!window.api?.writeFile);

    const copyToClipboard = async (text: string): Promise<boolean> => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // fallback below
      }

      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    const methods = {
      copyReport: async () => {
        copyFeedback.value = '';
        try {
          const ok = await copyToClipboard(props.reportText);
          if (ok) {
            copyFeedback.value = t('errorReport.copySuccess');
          } else {
            $q.notify({ type: 'negative', message: t('errorReport.copyFailed') });
          }
        } catch {
          $q.notify({ type: 'negative', message: t('errorReport.copyFailed') });
        }
      },
      saveReport: async () => {
        if (!window.api?.showSaveDialog || !window.api?.writeFile) return;

        try {
          const date = new Date().toISOString().slice(0, 10);
          const result = await window.api.showSaveDialog({
            defaultPath: `actograph-error-${date}.txt`,
            filters: [
              { name: t('errorReport.saveFilterText'), extensions: ['txt'] },
              { name: t('errorReport.saveFilterAll'), extensions: ['*'] },
            ],
          });

          if (result.canceled || !result.filePath) {
            return;
          }

          const writeResult = await window.api.writeFile(result.filePath, props.reportText);
          if (writeResult.success) {
            $q.notify({ type: 'positive', message: t('errorReport.saveSuccess') });
          } else {
            $q.notify({ type: 'negative', message: t('errorReport.saveFailed') });
          }
        } catch {
          $q.notify({ type: 'negative', message: t('errorReport.saveFailed') });
        }
      },
    };

    return {
      dialogRef,
      onDialogHide,
      onCancelClick: onDialogCancel,
      copyFeedback,
      canSave,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.error-report-dialog__report {
  :deep(textarea) {
    max-height: 40vh;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.75rem;
  }
}
</style>
