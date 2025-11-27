<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 500px; max-width: 700px"
      bgColor="background"
      innerHeader
      title="Restauration automatique"
    >
      <DCardSection>
        <div class="text-body2 q-mb-md">
          Des sauvegardes automatiques récentes ont été trouvées. Sélectionnez celle que vous souhaitez restaurer :
        </div>

        <div v-if="state.files.length === 0" class="text-body1 text-grey-7 q-pa-md">
          Aucun fichier disponible.
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
                  Sauvegardé le {{ methods.formatDate(file.modified) }}
                  <span v-if="file.size"> • {{ methods.formatFileSize(file.size) }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="mdi-file-document-outline" size="24px" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <q-btn
            flat
            no-caps
            label="Ignorer"
            @click="methods.onCancelClick"
          />
          <DSubmitBtn
            label="Restaurer"
            @click="methods.onOKClick"
            :disable="state.selectedFileIndex === null"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DCard, DCardSection, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

export default defineComponent({
  name: 'AutosaveFilePicker',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
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
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      files: props.files,
      selectedFileIndex: props.files.length > 0 ? 0 : null as number | null, // Auto-select first file if available
    });

    const methods = {
      getObservationName: (fileName: string): string => {
        // Extract observation name from filename
        // Format: autosave_{id}_{name}_{timestamp}.jchronic
        const match = fileName.match(/autosave_\d+_(.+?)_\d{4}-\d{2}-\d{2}/);
        if (match && match[1]) {
          // Replace underscores with spaces and capitalize
          return match[1]
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
        }
        // Fallback: use filename without extension
        return fileName.replace(/\.jchronic$/, '').replace(/autosave_\d+_/, '');
      },

      formatDate: (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
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
          const selectedFile = state.files[state.selectedFileIndex];
          onDialogOK(selectedFile);
        }
      },

      onCancelClick: () => {
        onDialogCancel();
      },
    };

    return {
      dialogRef,
      onDialogHide,
      state,
      methods,
    };
  },
});
</script>

