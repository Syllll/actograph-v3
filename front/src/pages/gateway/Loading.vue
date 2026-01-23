<template>
  <div class="fit row justify-center items-center">
    <!-- First-launch extraction indicator -->
    <div v-if="state.isExtracting" class="column items-center q-gutter-md extraction-container">
      <q-icon name="mdi-package-variant" size="64px" color="primary" class="package-icon" />
      <div class="text-h5 text-center">Première utilisation</div>
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
        Veuillez patienter, cette opération est nécessaire uniquement au premier lancement.
      </div>
    </div>
    
    <!-- Normal loading -->
    <DInnerLoading v-else-if="state.loading">
      Chargement de l'application...
    </DInnerLoading>
    
    <!-- Error banner -->
    <q-banner class="bg-danger text-white rounded" v-else-if="state.error">
      {{ state.error }}
    </q-banner>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@lib-improba/composables/use-auth';
import securityService from '@services/security/index.service';
import { useStartupLoading } from 'src/composables/use-startup-loading';

// Type for the window.api object in Electron
declare global {
  interface Window {
    api?: {
      on: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    const router = useRouter();
    const auth = useAuth(router);
    const startupLoading = useStartupLoading();

    const state = reactive({
      loading: true,
      error: null as string | null,
      isExtracting: false,
      extractionMessage: 'Préparation de l\'application...',
      extractionProgress: 0,
    });

    // Listen for first-launch extraction events from Electron
    const setupExtractionListener = () => {
      if (process.env.MODE === 'electron' && window.api) {
        window.api.on('first-launch-extraction', (data: {
          status: string;
          message: string;
          progress?: number;
          serverPort?: number;
        }) => {
          console.log('First-launch extraction event:', data);
          
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
            case 'ready':
              state.isExtracting = false;
              state.extractionMessage = data.message;
              break;
            case 'error':
              state.isExtracting = false;
              state.error = data.message;
              break;
          }
        });
      }
    };

    onMounted(async () => {
      // Setup listener for extraction events
      setupExtractionListener();
      
      const start = new Date();
      // During this time, the app will check for update and initialize the backend
      const timeout = 60000 * 4;
      let isServerRunning = false;

      while (
        !isServerRunning &&
        new Date().getTime() - start.getTime() < timeout
      ) {
        // Wait 1 second before checking if the server is running
        await new Promise((resolve) => setTimeout(resolve, 500));

        let result = null as string | null;
        try {
          result = await securityService.sayHi();
        } catch (error) {
          // Don't log error if we're still extracting - it's expected
          if (!state.isExtracting) {
            console.error('Error while checking if the server is running', error);
          }
        }
        if (result === 'hi') {
          isServerRunning = true;
        }
      }
      if (!isServerRunning) {
        state.error =
          "Erreur lors de l'initialisation du backend de l'application, code=1";
        state.loading = false;
        state.isExtracting = false;
        return;
      }

      // Server is running, hide extraction indicator
      state.isExtracting = false;

      const localUserName = await securityService.getLocalUserName();

      try {
        await auth.methods.login(localUserName, localUserName.split('-')[1]);
      } catch (error) {
        state.error =
          "Erreur lors de l'initialisation de l'authentification de l'utilisateur, code=2";
        state.loading = false;
        return;
      }

      // If the application is running in electron mode, we need to check if there is an existing license on the pc
      // If not, we need to redirect to the choose-version page
      if (process.env.MODE === 'electron') {
        await startupLoading.methods.processLoadingAtStartup();
      }
    });

    return {
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
  0%, 100% {
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
