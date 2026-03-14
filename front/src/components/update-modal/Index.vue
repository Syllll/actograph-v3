<template>
  <DDialog
    title="Mise à jour disponible"
    :width="'50vw'"
    :useInnerPadding="false"
    :model-value="$props.triggerOpen"
    @update:model-value="$emit('update:triggerOpen', $event)"
  >
    <DScrollArea class="fit q-pa-sm">
      <div v-if="!state.updateDownloaded" class="column items-center">
        <p>
          <template v-if="state.isDownloading">
            Une mise à jour est disponible. Téléchargement en cours...
          </template>
          <template v-else>
            Une mise à jour est prête à etre telechargee.
          </template>
        </p>
        <DProgressBar
          color="accent"
          :value="state.progress"
          :label="state.progressPercentage"
          style="width: 10rem"
        />
      </div>
      <div v-else>
        <p>
          Mise à jour téléchargée. Veuillez redémarrer l'application pour
          l'installer.
        </p>
      </div>

      <div v-if="state.error">
        <p>
          Une erreur est survenue lors du téléchargement de la mise à jour.
          Vous pouvez réessayer ou fermer cette fenêtre et continuer.
        </p>
        <p>{{ state.error }}</p>
      </div>
    </DScrollArea>

    <template #actions>
      <DCancelBtn
        label="Plus tard"
        class="q-mx-sm"
        @click="methods.close"
      />
      <DSubmitBtn
        v-if="state.error && !state.updateDownloaded"
        label="Réessayer"
        class="q-mx-sm"
        @click="methods.retryDownload"
      />
      <DSubmitBtn
        label="Redémarrer et installer"
        :disabled="!state.updateDownloaded"
        class="q-mx-sm"
        @click="methods.submit"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import systemService from '@services/system/index.service';
import { DDialog, DSubmitBtn, DCancelBtn, DScrollArea, DProgressBar } from '@lib-improba/components';

export default defineComponent({
  components: { DDialog, DSubmitBtn, DCancelBtn, DScrollArea, DProgressBar },
  props: {
    triggerOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:triggerOpen'],
  setup(props, { emit }) {
    const state = reactive({
      progress: 0.0,
      progressPercentage: '0.00%',
      updateDownloaded: false,
      isDownloading: false,
      error: '' as string,
      initialized: false,
    });

    const methods = {
      startDownload: async () => {
        if (state.isDownloading || state.updateDownloaded) {
          return;
        }

        state.isDownloading = true;
        state.error = '';

        try {
          await systemService.downloadUpdate();
        } catch (error) {
          state.isDownloading = false;
          state.error = error instanceof Error ? error.message : 'Erreur inconnue';
          console.error('Error while starting update download', error);
        }
      },
      init: async () => {
        if (state.initialized) {
          await methods.startDownload();
          return;
        }

        systemService.onUpdateDownloadProgress((data) => {
          const parsedPercent = typeof data.percent === 'number'
            ? data.percent
            : Number(data.percent);
          const safePercent = Number.isFinite(parsedPercent) ? parsedPercent : 0;
          const percent = safePercent.toFixed(2);
          state.progress = parseFloat(percent) / 100;
          state.progressPercentage = `${percent}%`;
        });
        systemService.onUpdateDownloaded(() => {
          state.updateDownloaded = true;
          state.isDownloading = false;
          state.error = '';
          state.progress = 1;
          state.progressPercentage = '100.00%';
          console.info('Update downloaded');
        });
        systemService.onUpdateError((error) => {
          state.isDownloading = false;
          state.error = error?.message || 'Erreur inconnue';
          console.error('Error while downloading update', error);
        });

        state.initialized = true;

        await methods.startDownload();
      },
      retryDownload: async () => {
        state.progress = 0;
        state.progressPercentage = '0.00%';
        state.updateDownloaded = false;
        await methods.startDownload();
      },
      close: () => {
        emit('update:triggerOpen', false);
      },
      submit: async () => {
        if (!state.updateDownloaded) {
          return;
        }
        await systemService.quitAndInstallUpdate();
      },
    };

    watch(
      () => props.triggerOpen,
      (newVal) => {
        if (newVal) {
          void methods.init();
        }
      }
    );

    return {
      state,
      methods,
    };
  },
});
</script>

<style scoped lang="scss"></style>
