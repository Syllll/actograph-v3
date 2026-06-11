<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="$t('cloud.syncTitle')"
      icon="mdi-cloud"
      size="lg"
      :verticalShrink="false"
    >
      <template #inner-header-actions>
        <q-chip color="primary" text-color="white" dense class="q-mr-sm">
          {{ cloud.chroniclesCount.value }}/{{ cloud.cloudLimit }}
        </q-chip>
        <q-btn flat round dense icon="mdi-close" @click="onCloseClick" />
      </template>

      <div class="q-pa-none">
        <div class="row items-center justify-between q-pa-md bg-neutral-lower">
          <div class="row items-center">
            <q-icon name="mdi-account" size="sm" class="q-mr-sm" />
            <span class="text-body2">{{ cloud.sharedState.currentEmail }}</span>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn
              flat dense color="primary" icon="mdi-refresh"
              :label="$t('cloud.refresh')"
              @click="methods.refresh"
              :loading="cloud.sharedState.isLoading"
              no-caps
            />
            <q-btn
              flat dense class="text-neutral-high" icon="mdi-account-switch"
              :label="$t('cloud.changeAccount')"
              @click="methods.changeAccount"
              no-caps
            />
          </div>
        </div>

        <q-banner v-if="cloud.sharedState.error" class="bg-danger text-text-invert" dense>
          <template v-slot:avatar>
            <q-icon name="mdi-alert-circle" />
          </template>
          {{ cloud.sharedState.error }}
          <template v-slot:action>
            <q-btn flat :label="$t('common.ok')" @click="cloud.methods.clearError()" />
          </template>
        </q-banner>

        <div class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-xs">
            {{ $t('cloud.uploadSection') }}
          </div>
          <p class="text-caption text-grey-7 q-mb-md">
            {{ $t('cloud.uploadSectionHint') }}
          </p>
          <div class="column q-gutter-sm">
            <q-btn
              color="primary"
              icon="mdi-cloud-upload"
              :label="$t('cloud.uploadActiveChronicle')"
              class="self-start"
              @click="methods.uploadActiveChronicle"
              :loading="state.uploadingActive"
              :disable="cloud.isCloudFull.value || !observation.sharedState.currentObservation"
              no-caps
            />
            <q-btn
              color="primary"
              icon="mdi-file-upload-outline"
              :label="$t('cloud.uploadJchronic')"
              class="self-start"
              @click="methods.uploadFile"
              :loading="state.uploading"
              :disable="cloud.isCloudFull.value"
              no-caps
              flat
            />
            <p
              v-if="!observation.sharedState.currentObservation"
              class="text-caption text-grey-6 q-mb-none"
            >
              {{ $t('cloud.uploadActiveDisabledHint') }}
            </p>
            <q-banner
              v-if="cloud.isCloudFull.value"
              dense
              rounded
              class="bg-warning text-dark q-mt-xs"
            >
              <template #avatar>
                <q-icon name="mdi-alert" />
              </template>
              {{ $t('cloud.cloudFull', { limit: cloud.cloudLimit }) }}
            </q-banner>
          </div>
        </div>

        <q-separator />

        <div class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            {{ $t('cloud.filesSection') }}
          </div>

          <q-scroll-area style="height: 300px">
            <div
              v-if="cloud.sharedState.remoteChronicles.length === 0 && !cloud.sharedState.isLoading"
              class="text-center q-pa-xl text-neutral-high"
            >
              <q-icon name="mdi-cloud-off-outline" size="64px" class="q-mb-md" />
              <div class="text-h6">{{ $t('cloud.emptyCloudTitle') }}</div>
              <div class="text-body2 q-mt-sm">{{ $t('cloud.emptyCloudHint') }}</div>
            </div>

            <div
              v-if="cloud.sharedState.isLoading && cloud.sharedState.remoteChronicles.length === 0"
              class="text-center q-pa-xl"
            >
              <q-spinner-dots size="40px" color="primary" />
              <div class="q-mt-md text-neutral-high">{{ $t('cloud.loadingList') }}</div>
            </div>

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
                  <q-item-label class="text-weight-medium">{{ chronicle.name }}</q-item-label>
                  <q-item-label caption>
                    <q-chip
                      :color="chronicle.isJchronic ? 'primary' : 'grey'"
                      text-color="white" size="sm" dense class="q-mr-xs"
                    >
                      {{ chronicle.isJchronic ? '.jchronic' : '.chronic' }}
                    </q-chip>
                    <span class="text-neutral-high">{{ formatDate(chronicle.updatedAt) }}</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-xs">
                    <q-btn
                      round flat color="primary" icon="mdi-download"
                      @click="methods.downloadChronicle(chronicle)"
                      :loading="state.downloadingId === chronicle.id"
                    >
                      <q-tooltip>{{ $t('cloud.downloadTooltip') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      round flat color="negative" icon="mdi-delete"
                      @click="methods.confirmDelete(chronicle)"
                      :loading="state.deletingId === chronicle.id"
                    >
                      <q-tooltip>{{ $t('cloud.deleteTooltip') }}</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </div>
      </div>

      <template #actions>
        <div class="text-caption text-neutral-high">
          {{ $t('cloud.limitLabel', { limit: cloud.cloudLimit }) }}
        </div>
        <q-space />
        <DCancelBtn @click="onCloseClick" :label="$t('cloud.close')" />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useCloud } from 'src/composables/use-cloud';
import { useObservation } from 'src/composables/use-observation';
import {
  actographCloudService,
  type ICloudChronicle,
} from '@services/cloud/actograph-cloud.service';
import { DDialogCard, DCancelBtn } from '@lib-improba/components';

export default defineComponent({
  name: 'CloudSyncDialog',
  components: { DDialogCard, DCancelBtn },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t, locale } = useI18n();
    const cloud = useCloud();
    const observation = useObservation();

    const state = reactive({
      downloadingId: null as number | null,
      deletingId: null as number | null,
      uploading: false,
      uploadingActive: false,
    });

    const formatDate = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        const loc = locale.value === 'en-US' ? 'en-US' : 'fr-FR';
        return date.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
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
          class: 'actograph-dialog',
          title: t('cloud.changeAccountTitle'),
          message: t('cloud.changeAccountMessage'),
          cancel: true,
          persistent: true,
        }).onOk(async () => {
          await cloud.methods.logout();
          onDialogOK({ action: 'logout' });
        });
      },

      async uploadActiveChronicle() {
        const currentObservation = observation.sharedState.currentObservation;
        if (!currentObservation?.id) {
          $q.notify({ type: 'warning', message: t('cloud.noActiveChronicle') });
          return;
        }

        if (!cloud.sharedState.isAuthenticated) {
          $q.notify({ type: 'negative', message: t('cloud.notAuthenticated') });
          return;
        }

        state.uploadingActive = true;
        try {
          const result = await cloud.methods.uploadChronicle(
            currentObservation.id,
            currentObservation.name,
            t('cloud.uploadDescriptionDefault'),
          );

          if (result.success) {
            $q.notify({
              type: 'positive',
              message: t('cloud.uploadSuccess'),
              caption: t('cloud.uploadActiveSuccessCaption', { name: currentObservation.name }),
            });
          } else {
            $q.notify({
              type: 'negative',
              message: t('cloud.uploadError'),
              caption: result.error || t('common.unknownError'),
            });
          }
        } catch (error: any) {
          console.error('Active chronicle upload error:', error);
          $q.notify({
            type: 'negative',
            message: t('cloud.uploadError'),
            caption: error.message || t('common.unknownError'),
          });
        } finally {
          state.uploadingActive = false;
        }
      },

      async uploadFile() {
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({ type: 'negative', message: t('cloud.desktopOnly') });
          return;
        }
        try {
          let defaultPath = '';
          if (window.api?.getActographFolder) {
            defaultPath = await window.api.getActographFolder();
          }
          const dialogResult = await window.api.showOpenDialog({
            defaultPath: defaultPath || undefined,
            filters: [
              { name: t('cloud.chronicFiles'), extensions: ['jchronic'] },
              { name: t('dialogs.createObservation.allFiles'), extensions: ['*'] },
            ],
          });
          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) return;
          const filePath = dialogResult.filePaths[0];
          if (!filePath.toLowerCase().endsWith('.jchronic')) {
            $q.notify({ type: 'warning', message: t('cloud.jchronicOnly'), caption: t('cloud.chronicUploadNotSupported') });
            return;
          }
          if (!cloud.sharedState.isAuthenticated) {
            throw new Error(t('cloud.notAuthenticated'));
          }

          state.uploading = true;
          const readResult = await window.api.readFile(filePath);
          if (!readResult.success || !readResult.data) {
            throw new Error(readResult.error || t('cloud.readFileError'));
          }

          const fileName = filePath.split(/[/\\]/).pop() || 'file.jchronic';
          const uploadResult = await actographCloudService.uploadChronicle(
            fileName.replace('.jchronic', ''),
            t('cloud.uploadDescriptionDefault'),
            readResult.data,
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || t('common.unknownError'));
          }

          await cloud.methods.refreshList();
          $q.notify({
            type: 'positive',
            message: t('cloud.uploadSuccess'),
            caption: t('cloud.uploadSuccessCaption', { fileName }),
          });
        } catch (error: any) {
          console.error('Upload error:', error);
          $q.notify({ type: 'negative', message: t('cloud.uploadError'), caption: error.message || t('common.unknownError') });
        } finally {
          state.uploading = false;
        }
      },

      async downloadChronicle(chronicle: ICloudChronicle) {
        state.downloadingId = chronicle.id;
        try {
          const result = await cloud.methods.downloadChronicle(chronicle);
          if (result.success && result.observation) {
            $q.notify({ type: 'positive', message: t('cloud.importSuccess'), caption: t('cloud.importSuccessCaption', { name: chronicle.name }) });
            await observation.methods.loadObservation(result.observation.id);
            onDialogOK({ action: 'downloaded', observationId: result.observation.id });
          } else {
            $q.notify({ type: 'negative', message: t('cloud.downloadError'), caption: result.error });
          }
        } finally {
          state.downloadingId = null;
        }
      },

      confirmDelete(chronicle: ICloudChronicle) {
        $q.dialog({
          class: 'actograph-dialog',
          title: t('cloud.deleteTitle'),
          message: t('cloud.deleteMessage', { name: chronicle.name }),
          cancel: true,
          persistent: true,
          ok: { label: t('cloud.deleteConfirm'), color: 'negative' },
        }).onOk(() => methods.deleteChronicle(chronicle));
      },

      async deleteChronicle(chronicle: ICloudChronicle) {
        state.deletingId = chronicle.id;
        try {
          const result = await cloud.methods.deleteChronicle(chronicle.id);
          if (result.success) {
            $q.notify({ type: 'positive', message: t('cloud.deleteSuccess'), caption: t('cloud.deleteSuccessCaption', { name: chronicle.name }) });
          } else {
            $q.notify({ type: 'negative', message: t('cloud.deleteError'), caption: result.error });
          }
        } finally {
          state.deletingId = null;
        }
      },
    };

    const onCloseClick = () => { onDialogCancel(); };

    cloud.methods.refreshList();

    return {
      dialogRef,
      onDialogHide,
      onCloseClick,
      cloud,
      observation,
      state,
      methods,
      formatDate,
    };
  },
});
</script>

<style scoped lang="scss">
.chronicle-item {
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--neutral-lower);
  }
}
</style>
