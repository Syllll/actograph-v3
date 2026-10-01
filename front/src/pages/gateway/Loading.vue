<template>
  <div class="fit row justify-center items-center">
    <!-- First-launch extraction indicator -->
    <div
      v-if="state.isExtracting"
      class="column items-center q-gutter-md extraction-container"
    >
      <q-icon
        name="mdi-package-variant"
        size="64px"
        color="primary"
        class="package-icon"
      />
      <div class="text-h5 text-center">{{ $t('gateway.loadingFirstUse') }}</div>
      <div class="text-body1 text-center text-grey-7">
        {{ state.extractionMessage }}
      </div>

      <!-- Progress bar -->
      <div class="progress-container q-mt-md">
        <q-linear-progress
          :value="state.extractionProgress / 100"
          color="primary"
          track-color="grey-3"
          rounded
          size="12px"
          class="progress-bar"
        />
        <div class="text-caption text-grey-6 text-center q-mt-sm">
          {{ state.extractionProgress }}%
        </div>
      </div>

      <div class="text-caption text-grey-5 q-mt-sm">
        {{ $t('gateway.loadingPleaseWait') }}
      </div>
    </div>

    <!-- Normal loading -->
    <DInnerLoading v-else-if="state.loading">
      {{ $t('gateway.loadingApp') }}
    </DInnerLoading>

    <!-- Error banner -->
    <q-banner class="bg-danger text-white rounded" v-else-if="state.error">
      {{ state.error }}
      <template #action>
        <q-btn flat :label="$t('gateway.retry')" @click="retryStartup" />
        <q-btn
          v-if="canOpenLogs"
          flat
          :label="$t('gateway.openLogs')"
          @click="openLogs"
        />
      </template>
    </q-banner>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@lib-improba/composables/use-auth';
import securityService from '@services/security/index.service';
import { useStartupLoading } from 'src/composables/use-startup-loading';
import { deriveElectronLocalPassword } from '@actograph/core';
import { createStartupRunner } from 'src/utils/startup-runner';

// window.api type is already declared in lib-improba/boot/lib-improba.ts

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    const router = useRouter();
    const auth = useAuth(router);
    const startupLoading = useStartupLoading();
    const { t } = useI18n();

    const state = reactive({
      loading: true,
      error: null as string | null,
      isExtracting: false,
      extractionMessage: t('gateway.preparingApp'),
      extractionProgress: 0,
    });

    let appliedStatusFromEvent = false;
    let disposed = false;
    let removeStatusListener: (() => void) | undefined;
    let backendError: string | null = null;
    const runner = createStartupRunner(async () => {
      state.loading = true;
      state.error = null;
      backendError = null;
      let phase: 'backend' | 'auth' | 'access' = 'backend';
      try {
        if (process.env.MODE === 'electron' && process.env.PROD && window.api) {
          const result = (await window.api.invoke('ensure-backend')) as {
            ok: boolean;
          };
          if (!result.ok)
            throw new Error(backendError || t('gateway.initBackendError'));
        }
        const deadline = Date.now() + 240_000;
        let running = false;
        while (!disposed && !backendError && Date.now() < deadline) {
          try {
            running = (await securityService.sayHi()) === 'hi';
          } catch {
            /* startup is still in progress */
          }
          if (running) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (disposed) return false;
        if (!running || backendError)
          throw new Error(backendError || t('gateway.initBackendError'));
        state.isExtracting = false;
        phase = 'auth';
        const localUserName = await securityService.getLocalUserName();
        if (disposed) return false;
        await auth.methods.login(
          localUserName,
          deriveElectronLocalPassword(localUserName)
        );
        if (disposed) return false;
        phase = 'access';
        if (process.env.MODE === 'electron')
          await startupLoading.methods.processLoadingAtStartup();
        return true;
      } catch (error) {
        if (!disposed) {
          console.error('Application initialization failed', error);
          state.error =
            phase === 'backend'
              ? backendError || t('gateway.initBackendError')
              : t(
                  phase === 'auth'
                    ? 'gateway.initAuthError'
                    : 'gateway.initAccessError'
                );
          state.loading = false;
          state.isExtracting = false;
        }
        return false;
      }
    });
    const retryStartup = () => {
      void runner.run();
    };

    const applyServerStatus = (data: {
      status: string;
      message: string;
      progress?: number;
      serverPort?: number;
    }) => {
      switch (data.status) {
        case 'extracting':
          state.isExtracting = true;
          state.extractionMessage = data.message;
          if (data.progress !== undefined) {
            state.extractionProgress = data.progress;
          }
          break;
        case 'completed':
          state.extractionMessage = data.message;
          state.extractionProgress = 100;
          break;
        case 'starting-server':
          state.extractionMessage = data.message;
          state.extractionProgress = 100;
          break;
        case 'backend-ready':
        case 'ready':
          backendError = null;
          state.error = null;
          state.loading = true;
          retryStartup();
          state.isExtracting = false;
          state.extractionMessage = data.message;
          break;
        case 'backend-error':
        case 'error':
          backendError = data.message;
          state.isExtracting = false;
          state.loading = false;
          state.error = data.message;
          break;
      }
    };

    // Listen for first-launch extraction events from Electron
    const setupExtractionListener = () => {
      if (process.env.MODE === 'electron' && window.api) {
        removeStatusListener = window.api.on(
          'server-status',
          (data: {
            status: string;
            message: string;
            progress?: number;
            serverPort?: number;
          }) => {
            console.log('First-launch extraction event:', data);
            appliedStatusFromEvent = true;
            applyServerStatus(data);
          }
        );
      }
    };

    onMounted(async () => {
      // Setup listener for extraction events
      setupExtractionListener();

      if (process.env.MODE === 'electron' && window.api?.getServerStatus) {
        try {
          const lastStatus = await window.api.getServerStatus();
          // An event can land while the IPC round-trip is in flight; do not
          // replay a stale snapshot over a newer live status.
          if (lastStatus && !appliedStatusFromEvent) {
            applyServerStatus(lastStatus);
          }
        } catch (error) {
          console.error('Error while reading last server status', error);
        }
      }

      retryStartup();
    });

    onUnmounted(() => {
      disposed = true;
      runner.dispose();
      removeStatusListener?.();
    });

    const openLogs = () => {
      void window.api
        ?.invoke('open-logs')
        .catch((error) => console.error(error));
    };
    return {
      canOpenLogs: process.env.MODE === 'electron' && Boolean(window.api),
      openLogs,
      retryStartup,
      auth,
      state,
    };
  },
});
</script>

<style scoped lang="scss">
.extraction-container {
  max-width: 400px;
  padding: 2rem;
}

.package-icon {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.progress-container {
  width: 100%;
  min-width: 280px;
}

.progress-bar {
  border-radius: 6px;
}
</style>
