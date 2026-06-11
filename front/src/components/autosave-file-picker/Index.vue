<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="t('autosave.dialogTitle')"
      size="md"
    >
      <q-banner
        v-if="introMode !== 'recent' && computedState.allFilesOlderThan24h.value"
        dense
        rounded
        class="bg-warning text-dark q-mb-md"
      >
        <template #avatar>
          <q-icon name="mdi-clock-alert-outline" />
        </template>
        {{ t('autosave.introAllFiles') }}
      </q-banner>
      <div v-if="introMode === 'recent'" class="text-body2 q-mb-md">
        {{ t('autosave.intro') }}
      </div>
      <div v-else class="text-body2 q-mb-md">
        {{ t('autosave.introBrowse') }}
      </div>

      <div v-if="state.files.length === 0" class="text-body1 text-neutral-high q-pa-md">
        {{ t('autosave.noFiles') }}
      </div>

      <div v-else>
        <q-list separator>
          <q-item
            v-for="(file, index) in state.files"
            :key="index"
            clickable
            v-ripple
            :active="state.selectedFileIndex === index"
            active-class="bg-primary text-white"
            @click="state.selectedFileIndex = index"
          >
            <q-item-section>
              <q-item-label>{{ methods.getObservationName(file.name) }}</q-item-label>
              <q-item-label caption>
                {{ t('autosave.savedOn', { dateTime: methods.formatDate(file.modified, file.name) }) }}
                <span v-if="file.size"> • {{ methods.formatFileSize(file.size) }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="mdi-file-document-outline" size="24px" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <template #actions>
        <DCancelBtn :label="t('autosave.ignore')" @click="methods.onCancelClick" />
        <DSubmitBtn
          :label="t('autosave.restore')"
          @click="methods.onOKClick"
          :disable="state.selectedFileIndex === null"
        />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, PropType } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DDialogCard, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

function localeToBcp47(locale: string): string {
  if (locale === 'fr') return 'fr-FR';
  if (locale.startsWith('en')) return 'en-US';
  return locale.replace(/_/g, '-') || 'en-US';
}

export default defineComponent({
  name: 'AutosaveFilePicker',
  components: { DDialogCard, DCancelBtn, DSubmitBtn },
  props: {
    files: {
      type: Array as PropType<Array<{
        name: string;
        path: string;
        size: number;
        modified: string;
      }>>,
      required: true,
    },
    introMode: {
      type: String as PropType<'recent' | 'browse'>,
      default: 'recent',
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { t, locale } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      files: props.files,
      selectedFileIndex: props.files.length > 0 ? 0 : null as number | null,
    });

    const isFileOlderThan24h = (file: { modified: string }) => {
      const ageHours =
        (Date.now() - new Date(file.modified).getTime()) / (1000 * 60 * 60);
      return ageHours >= 24;
    };

    const computedState = {
      allFilesOlderThan24h: computed(
        () =>
          props.files.length > 0 && props.files.every((file) => isFileOlderThan24h(file)),
      ),
    };

    const methods = {
      getObservationName: (fileName: string): string => {
        const match = fileName.match(/autosave_\d+_(.+?)_\d{4}-\d{2}-\d{2}/);
        if (match && match[1]) {
          return match[1]
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
        }
        return fileName.replace(/\.jchronic$/, '').replace(/autosave_\d+_/, '');
      },

      formatDate: (dateString: string, fileName?: string): string => {
        let date = new Date(dateString);
        if (isNaN(date.getTime()) && fileName) {
          const tsMatch = fileName.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
          if (tsMatch) {
            const iso = `${tsMatch[1]}T${tsMatch[2]}:${tsMatch[3]}:${tsMatch[4]}.${tsMatch[5]}Z`;
            date = new Date(iso);
          }
        }
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString(localeToBcp47(locale.value), {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },

      formatFileSize: (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      },

      onOKClick: () => {
        if (state.selectedFileIndex !== null) {
          onDialogOK(state.files[state.selectedFileIndex]);
        }
      },

      onCancelClick: () => {
        onDialogCancel();
      },
    };

    return {
      t,
      computedState,
      dialogRef,
      onDialogHide,
      state,
      methods,
    };
  },
});
</script>
