<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Créer une chronique"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <q-input
            v-model="state.name"
            placeholder="Nom de la chronique"
            outlined
            dense
            :rules="[(val) => (val && val.length > 0) || 'Le nom est requis']"
          />
          <q-input
            v-model="state.description"
            placeholder="Description (optionnel)"
            outlined
            dense
            type="textarea"
            :rows="4"
          />
          
          <!-- Observation type: Video or Direct -->
          <q-select
            v-model="state.observationType"
            :options="observationTypeOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            label="Type d'observation"
            hint="Choisissez comment vous souhaitez observer"
            :rules="[(val) => val !== null && val !== undefined || 'Le type d\'observation est requis']"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          
          <!-- Video file selection (only if "Observer sur une vidéo" is selected) -->
          <div v-if="state.observationType === 'video'" class="column q-gutter-sm">
            <q-btn
              v-if="!state.videoPath"
              color="primary"
              icon="videocam"
              label="Sélectionner une vidéo"
              outline
              @click="methods.selectVideoFile"
          />
            <div v-else class="row items-center q-gutter-sm">
              <q-icon name="check_circle" color="positive" size="sm" />
              <span class="text-caption text-grey-7">{{ methods.getVideoFileName(state.videoPath) }}</span>
              <q-btn
                flat
                dense
                round
                icon="close"
                size="sm"
                @click="state.videoPath = null"
              />
            </div>
          </div>
          
          <!-- Mode selection (only if "Observer en direct" is selected) -->
          <q-select
            v-if="state.observationType === 'direct'"
            v-model="state.mode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            label="Mode de la chronique"
            hint="Le mode ne pourra pas être modifié après la création"
            :rules="[(val) => val !== null && val !== undefined || 'Le mode est requis']"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Créer"
            @click="onOKClick"
            :disable="!state.name || state.name.trim().length === 0"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';
import { ObservationModeEnum } from '@services/observations/interface';

export default defineComponent({
  name: 'CreateObservationDialog',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  setup() {
    const $q = useQuasar();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      name: '',
      description: '',
      observationType: 'direct' as 'video' | 'direct',
      videoPath: null as string | null,
      mode: ObservationModeEnum.Calendar as ObservationModeEnum,
    });

    const observationTypeOptions = [
      {
        label: 'Observer en direct',
        value: 'direct',
        description: 'Observation en temps réel sans vidéo',
      },
      {
        label: 'Observer sur une vidéo',
        value: 'video',
        description: 'Analyse d\'une vidéo enregistrée (mode chronomètre automatique)',
      },
    ];

    const modeOptions = [
      {
        label: 'Calendrier',
        value: ObservationModeEnum.Calendar,
        description: 'Les dates sont affichées comme des dates calendaires',
      },
      {
        label: 'Chronomètre',
        value: ObservationModeEnum.Chronometer,
        description: 'Les dates sont affichées comme des durées depuis un point de référence (t0)',
      },
    ];

    const methods = {
      selectVideoFile: async () => {
        // Check if Electron API is available
        if (!window.api || !window.api.showOpenDialog) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.',
          });
          return;
        }

        try {
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: 'Fichiers vidéo', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return;
          }

          state.videoPath = dialogResult.filePaths[0];
        } catch (error: any) {
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la sélection de la vidéo',
            caption: error.message,
          });
        }
      },

      getVideoFileName: (path: string | null): string => {
        if (!path) return '';
        // Extract filename from path
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || path;
      },

      onOKClick: () => {
        // If video is selected, mode is automatically Chronometer
        const finalMode = state.observationType === 'video' 
          ? ObservationModeEnum.Chronometer 
          : state.mode;

        // Validate video selection if video type is selected
        if (state.observationType === 'video' && !state.videoPath) {
          $q.notify({
            type: 'negative',
            message: 'Veuillez sélectionner un fichier vidéo',
          });
          return;
        }

        onDialogOK({
          name: state.name.trim(),
          description: state.description.trim() || undefined,
          mode: finalMode,
          videoPath: state.videoPath || undefined,
        });
      },
      onCancelClick: () => {
        onDialogCancel();
      },
    };

    return {
      dialogRef,
      state,
      observationTypeOptions,
      modeOptions,
      methods,
      onDialogHide,
      onOKClick: methods.onOKClick,
      onCancelClick: methods.onCancelClick,
    };
  },
});
</script>

