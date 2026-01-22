import { reactive, computed } from 'vue';
import { actographAuthService } from '@services/actograph-auth.service';
import {
  actographCloudService,
  type ICloudChronicle,
} from '@services/actograph-cloud.service';
import { exportService } from '@services/export.service';
import { importService } from '@services/import.service';

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
 * Composable pour la gestion du cloud ActoGraph
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
      description?: string
    ): Promise<{ success: boolean; error?: string }> {
      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        // Exporter la chronique au format .jchronic
        const exportResult = await exportService.exportToJchronic(observationId);

        if (!exportResult.success || !exportResult.content || !exportResult.fileName) {
          return {
            success: false,
            error: exportResult.error || "Erreur d'export",
          };
        }

        // Upload vers le cloud
        const uploadResult = await actographCloudService.uploadChronicle(
          exportResult.fileName,
          description || 'Uploaded from mobile',
          exportResult.content
        );

        if (uploadResult.success) {
          // Rafraîchir la liste
          await methods.refreshList();
        }

        return {
          success: uploadResult.success,
          error: uploadResult.error,
        };
      } finally {
        sharedState.isLoading = false;
      }
    },

    /**
     * Télécharge une chronique du cloud et l'importe localement
     * Note: Seulement pour les fichiers .jchronic
     */
    async downloadChronicle(
      chronicle: ICloudChronicle
    ): Promise<{ success: boolean; observationId?: number; error?: string }> {
      // Vérifier que c'est un .jchronic
      if (!chronicle.isJchronic) {
        return {
          success: false,
          error:
            'Ce fichier est au format ancien (.chronic). Utilisez l\'application web ou desktop pour le télécharger.',
        };
      }

      sharedState.isLoading = true;
      sharedState.error = null;

      try {
        // Télécharger le fichier
        const downloadResult = await actographCloudService.downloadChronicle(chronicle.id);

        if (!downloadResult.success || !downloadResult.content) {
          return {
            success: false,
            error: downloadResult.error || 'Erreur de téléchargement',
          };
        }

        // Importer le fichier
        const importResult = await importService.importJchronic(
          downloadResult.content,
          chronicle.name
        );

        if (importResult.success) {
          return {
            success: true,
            observationId: importResult.observationId,
          };
        } else {
          return {
            success: false,
            error: importResult.error || "Erreur d'import",
          };
        }
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
    async hasStoredCredentials(): Promise<boolean> {
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
