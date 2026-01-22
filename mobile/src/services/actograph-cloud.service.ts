import { actographAuthService } from './actograph-auth.service';

const ACTOGRAPH_API_URL = 'https://actograph.io/api';
const CLOUD_LIMIT = 10;

export interface ICloudChronicle {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Déterminé par l'extension du nom
  isJchronic: boolean;
}

export interface ICloudListResult {
  success: boolean;
  chronicles?: ICloudChronicle[];
  error?: string;
}

export interface ICloudUploadResult {
  success: boolean;
  chronicle?: ICloudChronicle;
  error?: string;
}

export interface ICloudDownloadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface ICloudDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Interface pour les données brutes de l'API actograph.io
 */
interface ICloudChronicleRaw {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service pour interagir avec le cloud actograph.io
 * 
 * Gère :
 * - Liste des fichiers cloud
 * - Upload de .jchronic
 * - Téléchargement de .jchronic (pas .chronic sur mobile)
 * - Suppression de fichiers
 */
class ActographCloudService {
  /**
   * Effectue une requête authentifiée avec reconnexion automatique si token expiré
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = actographAuthService.getToken();

    if (!token) {
      throw new Error('Non authentifié');
    }

    // Première tentative
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-Auth-Token': token,
      },
    });

    // Si token expiré (401), tenter reconnexion auto
    if (response.status === 401) {
      const reconnected = await actographAuthService.tryAutoReconnect();
      
      if (reconnected) {
        const newToken = actographAuthService.getToken();
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-Auth-Token': newToken!,
          },
        });
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }

    return response;
  }

  /**
   * Liste les fichiers dans le cloud
   */
  async listChronicles(): Promise<ICloudListResult> {
    try {
      const response = await this.authenticatedFetch(
        `${ACTOGRAPH_API_URL}/cloud/chronics`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur serveur: ${response.status}`,
        };
      }

      const data = await response.json();

      // Transformer les données et déterminer le format
      const chronicles: ICloudChronicle[] = (Array.isArray(data) ? data : []).map(
        (item: ICloudChronicleRaw) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isJchronic: item.name?.toLowerCase().endsWith('.jchronic') ?? false,
        })
      );

      return {
        success: true,
        chronicles,
      };
    } catch (error) {
      console.error('Error listing chronicles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Upload un fichier .jchronic vers le cloud
   */
  async uploadChronicle(
    name: string,
    description: string,
    content: string
  ): Promise<ICloudUploadResult> {
    try {
      // Vérifier la limite
      const listResult = await this.listChronicles();
      if (listResult.success && listResult.chronicles) {
        if (listResult.chronicles.length >= CLOUD_LIMIT) {
          return {
            success: false,
            error: `Limite de ${CLOUD_LIMIT} fichiers atteinte. Supprimez des fichiers pour en ajouter de nouveaux.`,
          };
        }
      }

      const token = actographAuthService.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Non authentifié',
        };
      }

      // Créer le FormData pour multipart upload
      const formData = new FormData();
      
      // S'assurer que le nom a l'extension .jchronic
      const fileName = name.endsWith('.jchronic') ? name : `${name}.jchronic`;
      
      formData.append('name', fileName.replace('.jchronic', ''));
      formData.append('description', description || 'Uploaded from mobile');
      
      // Créer un Blob pour le fichier
      const blob = new Blob([content], { type: 'application/json' });
      formData.append('chronic', blob, fileName);

      const response = await this.authenticatedFetch(
        `${ACTOGRAPH_API_URL}/cloud/chronic`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Erreur serveur: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        chronicle: {
          id: data.id,
          name: data.name,
          description: data.description,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isJchronic: true,
        },
      };
    } catch (error) {
      console.error('Error uploading chronicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Télécharge un fichier .jchronic depuis le cloud
   * Note: Les fichiers .chronic ne sont pas supportés sur mobile
   */
  async downloadChronicle(id: number): Promise<ICloudDownloadResult> {
    try {
      const response = await this.authenticatedFetch(
        `${ACTOGRAPH_API_URL}/cloud/chronic/${id}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur serveur: ${response.status}`,
        };
      }

      const content = await response.text();

      return {
        success: true,
        content,
      };
    } catch (error) {
      console.error('Error downloading chronicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Supprime un fichier du cloud
   */
  async deleteChronicle(id: number): Promise<ICloudDeleteResult> {
    try {
      const response = await this.authenticatedFetch(
        `${ACTOGRAPH_API_URL}/cloud/chronic/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Erreur serveur: ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting chronicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Retourne la limite de fichiers cloud
   */
  getCloudLimit(): number {
    return CLOUD_LIMIT;
  }
}

// Singleton
export const actographCloudService = new ActographCloudService();
