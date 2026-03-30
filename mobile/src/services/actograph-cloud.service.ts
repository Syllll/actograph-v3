import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
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
  date: string;
  file?: { id: number; name: string };
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
  private reconnectPromise: Promise<boolean> | null = null;

  /**
   * Effectue une requête authentifiée via CapacitorHttp (bypass CORS)
   * avec reconnexion automatique si token expiré
   */
  private async authenticatedRequest(options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    data?: unknown;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'document';
  }): Promise<HttpResponse> {
    const token = actographAuthService.getToken();

    if (!token) {
      throw new Error('Non authentifié');
    }

    let response = await CapacitorHttp.request({
      ...options,
      headers: { ...options.headers, 'X-Auth-Token': token },
    });

    if (response.status === 401) {
      const reconnected = await this.doAutoReconnect();

      if (reconnected) {
        const newToken = actographAuthService.getToken();
        if (!newToken) {
          throw new Error('Token manquant après reconnexion');
        }
        response = await CapacitorHttp.request({
          ...options,
          headers: { ...options.headers, 'X-Auth-Token': newToken },
        });
      } else {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }

    return response;
  }

  private async doAutoReconnect(): Promise<boolean> {
    if (this.reconnectPromise) {
      return this.reconnectPromise;
    }
    this.reconnectPromise = actographAuthService.tryAutoReconnect();
    try {
      return await this.reconnectPromise;
    } finally {
      this.reconnectPromise = null;
    }
  }

  /**
   * Liste les fichiers dans le cloud
   */
  async listChronicles(): Promise<ICloudListResult> {
    try {
      const response = await this.authenticatedRequest({
        url: `${ACTOGRAPH_API_URL}/cloud/chronics`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: `Erreur serveur: ${response.status}`,
        };
      }

      const data = response.data;

      const chronicles: ICloudChronicle[] = (Array.isArray(data) ? data : [])
        .map((item: ICloudChronicleRaw) => {
          const itemName = item.name ?? '';
          const fileName = item.file?.name ?? '';
          const isJchronic =
            itemName.toLowerCase().endsWith('.jchronic') ||
            fileName.toLowerCase().endsWith('.jchronic');

          return {
            id: item.id,
            name: itemName,
            description: item.description,
            createdAt: item.date,
            updatedAt: item.date,
            isJchronic,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

      const fileName = name.endsWith('.jchronic') ? name : `${name}.jchronic`;
      const boundary = `----CapacitorBoundary${Date.now()}`;

      let body = '';
      body += `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${fileName}\r\n`;
      body += `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\n${description || 'Uploaded from mobile'}\r\n`;
      body += `--${boundary}\r\nContent-Disposition: form-data; name="chronic"; filename="${fileName}"\r\nContent-Type: application/json\r\n\r\n${content}\r\n`;
      body += `--${boundary}--\r\n`;

      const response = await this.authenticatedRequest({
        url: `${ACTOGRAPH_API_URL}/cloud/chronic`,
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        data: body,
      });

      if (response.status < 200 || response.status >= 300) {
        const errorData = typeof response.data === 'object' ? response.data : {};
        return {
          success: false,
          error: errorData?.message || `Erreur serveur: ${response.status}`,
        };
      }

      const data = response.data;

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
      const response = await this.authenticatedRequest({
        url: `${ACTOGRAPH_API_URL}/cloud/chronic/${id}`,
        method: 'GET',
        responseType: 'text',
      });

      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: `Erreur serveur: ${response.status}`,
        };
      }

      const content = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

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
      const response = await this.authenticatedRequest({
        url: `${ACTOGRAPH_API_URL}/cloud/chronic/${id}`,
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status < 200 || response.status >= 300) {
        const errorData = typeof response.data === 'object' ? response.data : {};
        return {
          success: false,
          error: errorData?.message || `Erreur serveur: ${response.status}`,
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
