import { reactive, computed } from 'vue';
import { actographAuthService } from '@services/cloud/actograph-auth.service';
import {
  actographCloudService,
  type ICloudChronicle,
} from '@services/cloud/actograph-cloud.service';
import { observationService } from '@services/observations/index.service';
import { IObservation } from '@services/observations/interface';

/**
 * État partagé du cloud
 */
const sharedState = reactive({
  isInitialized: false,
  isAuthenticated: false,
  currentEmail: null as string | null,
  remoteChronicles: [] as ICloudChronicle[],
  isLoading: false,
  error: null as string | null,
});

/**
 * Composable pour la gestion du cloud ActoGraph sur desktop
 */
export function useCloud() {
  const cloudLimit = actographCloudService.getCloudLimit();

  const isCloudFull = computed(() => {
    return sharedState.remoteChronicles.length >= cloudLimit;
  });

  const chroniclesCount = computed(() => {
    return sharedState.remoteChronicles.length;
  });

  const methods = {
    /**
     * Initialise le service cloud (à appeler au démarrage de l'app)
     */
    async init(): Promise<void> {
      if (sharedState.isInitialized) return;

      try {
        await actographAuthService.init();
        sharedState.isAuthenticated = actographAuthService.isAuthenticated();
        sharedState.currentEmail = actographAuthService.getEmail();
        sharedState.isInitialized = true;
      } catch (error) {
        console.error('Error initializing cloud:', error);
      }
    },

    /**
     * Connexion à actograph.io
     */
    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        const result = await actographAuthService.login(email, password);

        if (result.success) {
          sharedState.isAuthenticated = true;
          sharedState.currentEmail = actographAuthService.getEmail();
          // Charger la liste des fichiers après connexion
          await methods.refreshList();
        } else {
          sharedState.error = result.error || 'Erreur de connexion';
        }

        return result;
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Déconnexion
     */
    async logout(): Promise<void> {
      await actographAuthService.logout();
      sharedState.isAuthenticated = false;
      sharedState.currentEmail = null;
      sharedState.remoteChronicles = [];
      sharedState.error = null;
    },

    /**
     * Rafraîchit la liste des fichiers cloud
     */
    async refreshList(): Promise<void> {
      if (!sharedState.isAuthenticated) return;

      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        const result = await actographCloudService.listChronicles();

        if (result.success && result.chronicles) {
          sharedState.remoteChronicles = result.chronicles;
        } else {
          sharedState.error = result.error || 'Erreur de chargement';
        }
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Upload une chronique locale vers le cloud
     */
    async uploadChronicle(
      observationId: number,
      observationName: string,
      description?: string
    ): Promise<{ success: boolean; error?: string }> {
      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        // Récupérer les données d'export depuis le backend
        const exportData = await observationService.exportObservation(observationId);
        const content = JSON.stringify(exportData, null, 2);

        // Upload vers le cloud
        const uploadResult = await actographCloudService.uploadChronicle(
          observationName,
          description || 'Uploaded from desktop',
          content
        );

        if (uploadResult.success) {
          // Rafraîchir la liste
          await methods.refreshList();
        }

        return {
          success: uploadResult.success,
          error: uploadResult.error,
        };
      } catch (error) {
        console.error('Error uploading chronicle:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Télécharge une chronique du cloud et l'importe localement
     * Supporte les fichiers .jchronic et .chronic
     */
    async downloadChronicle(
      chronicle: ICloudChronicle
    ): Promise<{ success: boolean; observation?: IObservation; error?: string }> {
      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        // Télécharger le fichier
        const downloadResult = await actographCloudService.downloadChronicle(chronicle.id);

        if (!downloadResult.success || !downloadResult.content) {
          const errorMsg = downloadResult.error || 'Erreur de téléchargement';
          const is401 = /401|session expirée|non authentifié/i.test(errorMsg);
          return {
            success: false,
            error: is401
              ? 'Session expirée. Veuillez vous déconnecter et vous reconnecter au cloud.'
              : errorMsg,
          };
        }

        // Créer un fichier File pour l'import via le backend
        const fileName = chronicle.name;
        const file = new File([downloadResult.content], fileName, {
          type: 'application/json',
        });

        // Importer via le backend qui gère les deux formats
        const observation = await observationService.importObservation(file);

        return {
          success: true,
          observation,
        };
      } catch (error: unknown) {
        console.error('Error downloading chronicle:', error);
        let errorMsg = 'Erreur d\'import';
        if (error instanceof Error) {
          errorMsg = error.message;
          if (/401|session expirée|non authentifié/i.test(errorMsg)) {
            errorMsg = 'Session expirée. Veuillez vous déconnecter et vous reconnecter au cloud.';
          }
        }
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Supprime une chronique du cloud
     */
    async deleteChronicle(id: number): Promise<{ success: boolean; error?: string }> {
      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        const result = await actographCloudService.deleteChronicle(id);

        if (result.success) {
          // Rafraîchir la liste
          await methods.refreshList();
        }

        return result;
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Vérifie si des credentials sont sauvegardés
     */
    hasStoredCredentials(): boolean {
      return actographAuthService.hasStoredCredentials();
    },

    /**
     * Efface l'erreur courante
     */
    clearError(): void {
      sharedState.error = null;
    },
  };

  return {
    sharedState,
    cloudLimit,
    isCloudFull,
    chroniclesCount,
    methods,
  };
}
