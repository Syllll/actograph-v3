<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" maximized>
    <q-card class="cloud-sync-dialog column">
      <!-- Header -->
      <q-card-section class="bg-primary text-white">
        <div class="row items-center justify-between">
          <div class="row items-center">
            <q-icon name="mdi-cloud" size="24px" class="q-mr-sm" />
            <div>
              <div class="text-h6">Cloud ActoGraph</div>
              <div class="text-caption">{{ cloud.sharedState.currentEmail }}</div>
            </div>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-chip color="white" text-color="primary" dense>
              {{ cloud.chroniclesCount.value }}/{{ cloud.cloudLimit }}
            </q-chip>
            <q-btn flat round icon="mdi-close" @click="onCloseClick" />
          </div>
        </div>
      </q-card-section>

      <!-- Actions bar -->
      <q-card-section class="q-py-sm bg-grey-2">
        <div class="row items-center justify-between">
          <q-btn
            flat
            dense
            color="primary"
            icon="mdi-refresh"
            label="Actualiser"
            @click="methods.refresh"
            :loading="cloud.sharedState.isLoading"
          />
          <q-btn
            flat
            dense
            color="grey-7"
            icon="mdi-account-switch"
            label="Changer de compte"
            @click="methods.changeAccount"
          />
        </div>
      </q-card-section>

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

      <!-- Chronicles list -->
      <q-card-section class="col q-pa-none scroll">
        <q-list separator>
          <!-- Empty state -->
          <div v-if="cloud.sharedState.remoteChronicles.length === 0 && !cloud.sharedState.isLoading" class="text-center q-pa-xl text-grey">
            <q-icon name="mdi-cloud-off-outline" size="64px" class="q-mb-md" />
            <div class="text-h6">Aucun fichier dans le cloud</div>
            <div class="text-body2 q-mt-sm">
              Uploadez vos chroniques depuis la page d'accueil
            </div>
          </div>

          <!-- Loading -->
          <div v-if="cloud.sharedState.isLoading && cloud.sharedState.remoteChronicles.length === 0" class="text-center q-pa-xl">
            <q-spinner-dots size="40px" color="primary" />
            <div class="q-mt-md text-grey">Chargement...</div>
          </div>

          <!-- Chronicle items -->
          <q-item
            v-for="chronicle in cloud.sharedState.remoteChronicles"
            :key="chronicle.id"
            class="chronicle-item"
          >
            <q-item-section avatar>
              <q-avatar
                :color="chronicle.isJchronic ? 'primary' : 'grey-5'"
                text-color="white"
                :icon="chronicle.isJchronic ? 'mdi-file-document' : 'mdi-file-lock'"
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
              <q-item-label v-if="!chronicle.isJchronic" caption class="text-warning q-mt-xs">
                <q-icon name="mdi-information" size="14px" class="q-mr-xs" />
                Format non supporté sur mobile
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="row q-gutter-xs">
                <!-- Download button -->
                <q-btn
                  v-if="chronicle.isJchronic"
                  round
                  flat
                  color="primary"
                  icon="mdi-download"
                  @click="methods.downloadChronicle(chronicle)"
                  :loading="state.downloadingId === chronicle.id"
                >
                  <q-tooltip>Télécharger</q-tooltip>
                </q-btn>
                <q-btn
                  v-else
                  round
                  flat
                  color="grey"
                  icon="mdi-download-off"
                  disable
                >
                  <q-tooltip>Non téléchargeable sur mobile</q-tooltip>
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
                  <q-tooltip>Supprimer</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- Footer -->
      <q-card-section class="bg-grey-1 q-py-sm">
        <div class="text-center text-caption text-grey-7">
          Limite : {{ cloud.cloudLimit }} fichiers par compte
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useCloud } from '@composables/use-cloud';
import type { ICloudChronicle } from '@services/actograph-cloud.service';

export default defineComponent({
  name: 'CloudSyncDialog',
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();
    const cloud = useCloud();

    const state = reactive({
      downloadingId: null as number | null,
      deletingId: null as number | null,
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

      async downloadChronicle(chronicle: ICloudChronicle) {
        if (!chronicle.isJchronic) {
          $q.notify({
            type: 'warning',
            message: 'Ce fichier est au format ancien (.chronic).',
            caption: "Utilisez l'application web ou desktop pour le télécharger.",
          });
          return;
        }

        state.downloadingId = chronicle.id;

        try {
          const result = await cloud.methods.downloadChronicle(chronicle);

          if (result.success) {
            $q.notify({
              type: 'positive',
              message: 'Chronique téléchargée !',
              caption: `${chronicle.name} a été importée sur votre appareil.`,
            });
            onDialogOK({ action: 'downloaded', observationId: result.observationId });
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

    onMounted(() => {
      cloud.methods.refreshList();
    });

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
  height: 100%;
}

.chronicle-item {
  transition: background-color 0.2s ease;

  &:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
