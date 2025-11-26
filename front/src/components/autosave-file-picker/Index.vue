<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 500px; max-width: 700px"
      bgColor="background"
      innerHeader
      title="Sélectionner un fichier à restaurer"
    >
      <DCardSection>
        <div v-if="state.loading" class="row justify-center q-pa-lg">
          <q-spinner color="primary" size="3em" />
        </div>

        <div v-else-if="state.error" class="text-negative q-mb-md">
          {{ state.error }}
        </div>

        <div v-else-if="state.files.length === 0" class="text-body1 text-grey-7 q-pa-md">
          Aucun fichier de sauvegarde automatique disponible.
        </div>

        <div v-else class="column q-gutter-sm">
          <div class="text-body2 text-grey-7 q-mb-sm">
            Sélectionnez le fichier que vous souhaitez restaurer :
          </div>

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
                <q-item-label>{{ getObservationName(file.name) }}</q-item-label>
                <q-item-label caption>
                  Sauvegardé le {{ formatDate(file.modified) }}
                  <span v-if="file.size"> • {{ formatFileSize(file.size) }}</span>
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
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Restaurer"
            @click="onOKClick"
            :disable="state.selectedFileIndex === null || state.loading"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DCard, DCardSection, DCancelBtn, DSubmitBtn } from '@lib-improba/components';
import { autosaveService } from '@services/observations/autosave.service';

export default defineComponent({
  name: 'AutosaveFilePicker',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      files: [] as Array<{
        name: string;
        path: string;
        size: number;
        modified: string;
      }>,
      selectedFileIndex: null as number | null,
      loading: true,
      error: null as string | null,
    });

    const methods = {
      loadFiles: async () => {
        state.loading = true;
        state.error = null;
        try {
          const files = await autosaveService.listAutosaveFiles();
          // Sort by modification date (most recent first)
          state.files = files.sort(
            (a, b) =>
              new Date(b.modified).getTime() - new Date(a.modified).getTime()
          );
        } catch (error) {
          state.error =
            error instanceof Error
              ? error.message
              : 'Erreur lors du chargement des fichiers';
        } finally {
          state.loading = false;
        }
      },

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

    onMounted(() => {
      methods.loadFiles();
    });

    return {
      dialogRef,
      onDialogHide,
      state,
      methods,
    };
  },
});
</script>

