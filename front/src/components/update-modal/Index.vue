<template>
  <DDialog
    :title="$t('updateModal.title')"
    :width="'50vw'"
    :useInnerPadding="false"
    :model-value="$props.triggerOpen"
    :persistent="state.phase === 'installing'"
    @update:model-value="$emit('update:triggerOpen', $event)"
  >
    <div class="update-modal-body q-pa-sm">
      <div v-if="state.phase === 'ready'" class="column items-center text-center q-py-md">
        <q-icon name="mdi-check-circle-outline" color="positive" size="48px" class="q-mb-sm" />
        <p class="q-mb-none">{{ $t('updateModal.downloadedBody') }}</p>
      </div>
      <div v-else class="column items-center text-center q-py-md q-gutter-sm">
        <p class="q-mb-none row items-center justify-center q-gutter-sm">
          <q-spinner
            v-if="['downloading', 'preparing', 'installing'].includes(state.phase)"
            size="1.25em"
          />
          <span>
            <template v-if="state.phase === 'installing'">
              {{ $t('updateModal.installing') }}
            </template>
            <template v-else-if="state.phase === 'preparing'">
              {{ $t('updateModal.preparing') }}
            </template>
            <template v-else-if="state.phase === 'downloading'">
              {{ $t('updateModal.downloading') }}
            </template>
            <template v-else-if="state.error">
              {{ $t('updateModal.errorIntro') }}
            </template>
            <template v-else>
              {{ $t('updateModal.readyToDownload') }}
            </template>
          </span>
        </p>
        <DProgressBar
          v-if="state.phase === 'downloading' || state.phase === 'preparing'"
          color="accent"
          :value="state.progress"
          :label="state.progressPercentage"
          class="update-progress"
        />
        <p v-if="state.error" class="text-negative text-body2 q-mb-none">
          {{ state.error }}
        </p>
      </div>
    </div>

    <template #actions>
      <DCancelBtn
        :label="$t('updateModal.later')"
        :disable="state.phase === 'installing'"
        class="q-mx-sm"
        @click="methods.close"
      />
      <DSubmitBtn
        v-if="state.phase === 'idle'"
        :label="$t('updateModal.download')"
        class="q-mx-sm"
        @click="methods.startDownload"
      />
      <DSubmitBtn
        v-if="state.phase === 'error' && state.canRetry"
        :label="$t('updateModal.retry')"
        class="q-mx-sm"
        @click="methods.retryDownload"
      />
      <DSubmitBtn
        v-if="state.phase === 'ready' || state.phase === 'installing'"
        :label="$t('updateModal.restartInstall')"
        :loading="state.phase === 'installing'"
        :disable="state.phase === 'installing'"
        class="q-mx-sm"
        @click="methods.submit"
      />
      <DCancelBtn
        v-if="state.phase === 'error'"
        :label="$t('updateModal.openLogs')"
        class="q-mx-sm"
        @click="methods.openLogs"
      />
    </template>
  </DDialog>
</template>

<script lang="ts">
import { defineComponent, onUnmounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import systemService from '@services/system/index.service';
import { DDialog, DSubmitBtn, DCancelBtn, DProgressBar } from '@lib-improba/components';
import type { DesktopUpdatePhase, DesktopUpdateState } from 'src/utils/desktop-update-state';

export default defineComponent({
  components: { DDialog, DSubmitBtn, DCancelBtn, DProgressBar },
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
      phase: 'idle' as DesktopUpdatePhase,
      error: '' as string,
      initialized: false,
      canRetry: true,
    });
    const subscriptions: Array<() => void> = [];
    let stateRevision = 0;
    let unmounted = false;

    const applyUpdateState = (update: DesktopUpdateState) => {
      state.phase = update.phase;
      state.canRetry = update.code !== 'preparation-timeout';
      state.error = update.code
        ? t(update.code === 'preparation-timeout'
          ? 'updateModal.preparationTimeout'
          : 'updateModal.installationTimeout')
        : update.error || '';
      if (['preparing', 'ready', 'installing'].includes(update.phase)) {
        state.progress = 1;
        state.progressPercentage = '100.00%';
      }
    };

    const methods = {
      startDownload: async () => {
        if (state.phase !== 'idle' && state.phase !== 'error') {
          return;
        }

        stateRevision++;
        state.phase = 'downloading';
        state.progress = 0;
        state.progressPercentage = '0.00%';
        state.error = '';

        try {
          await systemService.downloadUpdate();
        } catch (error) {
          state.phase = 'error';
          state.error = error instanceof Error ? error.message : t('common.unknownError');
          console.error('Error while starting update download', error);
        }
      },
      init: async () => {
        if (!state.initialized) {
          subscriptions.push(systemService.onUpdateDownloadProgress((data) => {
            const parsedPercent = typeof data.percent === 'number'
              ? data.percent
              : Number(data.percent);
            const safePercent = Number.isFinite(parsedPercent) ? parsedPercent : 0;
            const percent = safePercent.toFixed(2);
            state.progress = parseFloat(percent) / 100;
            state.progressPercentage = `${percent}%`;
          }));
          subscriptions.push(systemService.onUpdateState((update) => {
            stateRevision++;
            applyUpdateState(update);
          }));

          state.initialized = true;
        }
        // Reopening a window must recover the main process state. A newer push
        // event takes precedence over the in-flight snapshot response.
        const revision = stateRevision;
        try {
          const update = await systemService.getUpdateState();
          if (!unmounted && revision === stateRevision) applyUpdateState(update);
        } catch (error) {
          if (!unmounted && revision === stateRevision) {
            state.phase = 'error';
            state.error = error instanceof Error ? error.message : t('common.unknownError');
          }
        }
      },
      retryDownload: async () => {
        await methods.startDownload();
      },
      close: () => {
        if (state.phase === 'installing') return;
        emit('update:triggerOpen', false);
      },
      submit: async () => {
        if (state.phase !== 'ready') {
          return;
        }
        stateRevision++;
        state.phase = 'installing';
        try {
          await systemService.quitAndInstallUpdate();
        } catch (error) {
          state.phase = 'error';
          state.error = error instanceof Error ? error.message : t('common.unknownError');
        }
      },
      openLogs: () => systemService.openLogs(),
    };

    watch(
      () => props.triggerOpen,
      (newVal) => {
        if (newVal) {
          void methods.init();
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      unmounted = true;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });

    return {
      state,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.update-progress {
  width: min(100%, 20rem);
}
</style>
