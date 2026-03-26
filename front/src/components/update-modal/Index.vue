<template>
  <DDialog
    :title="$t('updateModal.title')"
    :width="'50vw'"
    :useInnerPadding="false"
    :model-value="$props.triggerOpen"
    @update:model-value="$emit('update:triggerOpen', $event)"
  >
    <DScrollArea class="fit q-pa-sm">
      <div v-if="!state.updateDownloaded" class="column items-center">
        <p>
          <template v-if="state.isDownloading">
            {{ $t('updateModal.downloading') }}
          </template>
          <template v-else>
            {{ $t('updateModal.readyToDownload') }}
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
          {{ $t('updateModal.downloadedBody') }}
        </p>
      </div>

      <div v-if="state.error">
        <p>
          {{ $t('updateModal.errorIntro') }}
        </p>
        <p>{{ state.error }}</p>
      </div>
    </DScrollArea>

    <template #actions>
      <DCancelBtn
        :label="$t('updateModal.later')"
        class="q-mx-sm"
        @click="methods.close"
      />
      <DSubmitBtn
        v-if="state.error && !state.updateDownloaded"
        :label="$t('updateModal.retry')"
        class="q-mx-sm"
        @click="methods.retryDownload"
      />
      <DSubmitBtn
        :label="$t('updateModal.restartInstall')"
        :disabled="!state.updateDownloaded"
        class="q-mx-sm"
        @click="methods.submit"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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
    const { t } = useI18n();
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
          state.error = error instanceof Error ? error.message : t('common.unknownError');
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
          state.error = error?.message || t('common.unknownError');
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
