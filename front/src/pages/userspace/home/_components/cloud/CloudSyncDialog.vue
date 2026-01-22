<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin cloud-sync-dialog"
      style="width: 600px; max-width: 90vw; max-height: 80vh"
      bgColor="background"
      innerHeader
      title="Cloud ActoGraph"
      icon="mdi-cloud"
      :verticalShrink="false"
    >
      <template v-slot:inner-header-actions>
        <q-chip color="primary" text-color="white" dense class="q-mr-sm">
          {{ cloud.chroniclesCount.value }}/{{ cloud.cloudLimit }}
        </q-chip>
        <q-btn flat round dense icon="mdi-close" @click="onCloseClick" />
      </template>

      <DCardSection class="q-pa-none">
        <!-- User info and actions bar -->
        <div class="row items-center justify-between q-pa-md bg-grey-2">
          <div class="row items-center">
            <q-icon name="mdi-account" size="sm" class="q-mr-sm" />
            <span class="text-body2">{{ cloud.sharedState.currentEmail }}</span>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn
              flat
              dense
              color="primary"
              icon="mdi-refresh"
              label="Actualiser"
              @click="methods.refresh"
              :loading="cloud.sharedState.isLoading"
              no-caps
            />
            <q-btn
              flat
              dense
              color="grey-7"
              icon="mdi-account-switch"
              label="Changer de compte"
              @click="methods.changeAccount"
              no-caps
            />
          </div>
        </div>

        <!-- Error banner -->
        <q-banner v-if="cloud.sharedState.error" class="bg-negative text-white" dense>
          <template v-slot:avatar>
            <q-icon name="mdi-alert-circle" />
          </template>
          {{ cloud.sharedState.error }}
          <template v-slot:action>
            <q-btn flat label="OK" @click="cloud.methods.clearError()" />
          </template>
        </q-banner>

        <!-- Actions : Upload -->
        <div class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            Envoyer vers le cloud
          </div>
          <div class="row items-center q-gutter-md">
            <q-btn
              color="primary"
              icon="mdi-cloud-upload"
              label="Envoyer un fichier .jchronic"
              @click="methods.uploadFile"
              :loading="state.uploading"
              :disable="cloud.isCloudFull.value"
              no-caps
              outline
            />
            <span v-if="cloud.isCloudFull.value" class="text-caption text-warning">
              <q-icon name="mdi-alert" size="xs" class="q-mr-xs" />
              Cloud plein ({{ cloud.cloudLimit }} fichiers max)
            </span>
          </div>
        </div>

        <q-separator />

        <!-- Liste des fichiers cloud -->
        <div class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            Fichiers dans le cloud
          </div>
          
          <q-scroll-area style="height: 300px">
            <!-- Empty state -->
            <div 
              v-if="cloud.sharedState.remoteChronicles.length === 0 && !cloud.sharedState.isLoading" 
              class="text-center q-pa-xl text-grey"
            >
              <q-icon name="mdi-cloud-off-outline" size="64px" class="q-mb-md" />
              <div class="text-h6">Aucun fichier dans le cloud</div>
              <div class="text-body2 q-mt-sm">
                Envoyez vos chroniques vers le cloud pour les synchroniser entre vos appareils.
              </div>
            </div>

            <!-- Loading -->
            <div 
              v-if="cloud.sharedState.isLoading && cloud.sharedState.remoteChronicles.length === 0" 
              class="text-center q-pa-xl"
            >
              <q-spinner-dots size="40px" color="primary" />
              <div class="q-mt-md text-grey">Chargement...</div>
            </div>

            <!-- Chronicle items -->
            <q-list separator>
              <q-item
                v-for="chronicle in cloud.sharedState.remoteChronicles"
                :key="chronicle.id"
                class="chronicle-item"
              >
                <q-item-section avatar>
                  <q-avatar
                    :color="chronicle.isJchronic ? 'primary' : 'grey-5'"
                    text-color="white"
                    :icon="chronicle.isJchronic ? 'mdi-file-document' : 'mdi-file-clock'"
                  />
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ chronicle.name }}
                  </q-item-label>
                  <q-item-label caption>
                    <q-chip
                      :color="chronicle.isJchronic ? 'primary' : 'grey'"
                      text-color="white"
                      size="sm"
                      dense
                      class="q-mr-xs"
                    >
                      {{ chronicle.isJchronic ? '.jchronic' : '.chronic' }}
                    </q-chip>
                    <span class="text-grey-6">
                      {{ formatDate(chronicle.updatedAt) }}
                    </span>
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <div class="row q-gutter-xs">
                    <!-- Download button -->
                    <q-btn
                      round
                      flat
                      color="primary"
                      icon="mdi-download"
                      @click="methods.downloadChronicle(chronicle)"
                      :loading="state.downloadingId === chronicle.id"
                    >
                      <q-tooltip>Télécharger et importer</q-tooltip>
                    </q-btn>

                    <!-- Delete button -->
                    <q-btn
                      round
                      flat
                      color="negative"
                      icon="mdi-delete"
                      @click="methods.confirmDelete(chronicle)"
                      :loading="state.deletingId === chronicle.id"
                    >
                      <q-tooltip>Supprimer du cloud</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-between full-width">
          <div class="text-caption text-grey-7">
            Limite : {{ cloud.cloudLimit }} fichiers par compte
          </div>
          <DCancelBtn @click="onCloseClick" label="Fermer" />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useCloud } from 'src/composables/use-cloud';
import { useObservation } from 'src/composables/use-observation';
import type { ICloudChronicle } from '@services/cloud/actograph-cloud.service';
import {
  DCard,
  DCardSection,
  DCancelBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'CloudSyncDialog',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();
    const cloud = useCloud();
    const observation = useObservation();

    const state = reactive({
      downloadingId: null as number | null,
      deletingId: null as number | null,
      uploading: false,
    });

    const formatDate = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return dateString;
      }
    };

    const methods = {
      async refresh() {
        await cloud.methods.refreshList();
      },

      async changeAccount() {
        $q.dialog({
          title: 'Changer de compte',
          message: 'Voulez-vous vous déconnecter et utiliser un autre compte ?',
          cancel: true,
          persistent: true,
        }).onOk(async () => {
          await cloud.methods.logout();
          onDialogOK({ action: 'logout' });
        });
      },

      async uploadFile() {
        // Vérifier si l'API Electron est disponible
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({
            type: 'negative',
            message: 'Cette fonctionnalité nécessite l\'application desktop.',
          });
          return;
        }

        try {
          // Ouvrir le dialogue de sélection de fichier
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: 'Fichiers Chronique', extensions: ['jchronic'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return;
          }

          const filePath = dialogResult.filePaths[0];
          
          // Vérifier que c'est un fichier .jchronic
          if (!filePath.toLowerCase().endsWith('.jchronic')) {
            $q.notify({
              type: 'warning',
              message: 'Seuls les fichiers .jchronic peuvent être envoyés vers le cloud.',
              caption: 'Les fichiers .chronic ne sont pas supportés pour l\'upload.',
            });
            return;
          }

          state.uploading = true;

          // Lire le contenu du fichier
          const readResult = await window.api.readFile(filePath);
          if (!readResult.success || !readResult.data) {
            throw new Error(readResult.error || 'Erreur de lecture du fichier');
          }

          // Extraire le nom du fichier
          const fileName = filePath.split(/[/\\]/).pop() || 'chronique.jchronic';

          // Upload vers le cloud via le service
          const token = localStorage.getItem('actograph_cloud_token');
          if (!token) {
            throw new Error('Non authentifié');
          }

          const formData = new FormData();
          formData.append('name', fileName.replace('.jchronic', ''));
          formData.append('description', 'Uploaded from desktop');
          const blob = new Blob([readResult.data], { type: 'application/json' });
          formData.append('chronic', blob, fileName);

          const response = await fetch('https://actograph.io/api/cloud/chronic', {
            method: 'POST',
            headers: {
              'X-Auth-Token': token,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur serveur: ${response.status}`);
          }

          // Rafraîchir la liste
          await cloud.methods.refreshList();

          $q.notify({
            type: 'positive',
            message: 'Fichier envoyé !',
            caption: `${fileName} a été envoyé vers le cloud.`,
          });
        } catch (error: any) {
          console.error('Upload error:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur d\'envoi',
            caption: error.message || 'Erreur inconnue',
          });
        } finally {
          state.uploading = false;
        }
      },

      async downloadChronicle(chronicle: ICloudChronicle) {
        state.downloadingId = chronicle.id;

        try {
          const result = await cloud.methods.downloadChronicle(chronicle);

          if (result.success && result.observation) {
            $q.notify({
              type: 'positive',
              message: 'Chronique importée !',
              caption: `${chronicle.name} a été importée dans l'application.`,
            });
            
            // Charger l'observation importée
            await observation.methods.loadObservation(result.observation.id);
            
            onDialogOK({ action: 'downloaded', observationId: result.observation.id });
          } else {
            $q.notify({
              type: 'negative',
              message: 'Erreur de téléchargement',
              caption: result.error,
            });
          }
        } finally {
          state.downloadingId = null;
        }
      },

      confirmDelete(chronicle: ICloudChronicle) {
        $q.dialog({
          title: 'Supprimer du cloud',
          message: `Voulez-vous supprimer "${chronicle.name}" du cloud ? Cette action est irréversible.`,
          cancel: true,
          persistent: true,
          ok: {
            label: 'Supprimer',
            color: 'negative',
          },
        }).onOk(() => methods.deleteChronicle(chronicle));
      },

      async deleteChronicle(chronicle: ICloudChronicle) {
        state.deletingId = chronicle.id;

        try {
          const result = await cloud.methods.deleteChronicle(chronicle.id);

          if (result.success) {
            $q.notify({
              type: 'positive',
              message: 'Fichier supprimé',
              caption: `${chronicle.name} a été supprimé du cloud.`,
            });
          } else {
            $q.notify({
              type: 'negative',
              message: 'Erreur de suppression',
              caption: result.error,
            });
          }
        } finally {
          state.deletingId = null;
        }
      },
    };

    const onCloseClick = () => {
      onDialogCancel();
    };

    // Charger la liste au montage
    cloud.methods.refreshList();

    return {
      dialogRef,
      onDialogHide,
      onCloseClick,
      cloud,
      state,
      methods,
      formatDate,
    };
  },
});
</script>

<style scoped lang="scss">
.cloud-sync-dialog {
  .chronicle-item {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.03);
    }
  }
}
</style>
