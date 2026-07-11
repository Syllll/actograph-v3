import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { exportService } from './export.service';

const SHARE_TMP_DIR = 'share_tmp';

export interface IShareResult {
  success: boolean;
  error?: string;
}

/**
 * Service de partage de fichiers .jchronic via la share sheet native (email, apps, etc.)
 */
class ShareService {
  /**
   * Partage une chronique locale au format .jchronic
   * Exporte depuis SQLite, écrit un fichier temporaire, ouvre la share sheet
   */
  async shareChronicle(observationId: number): Promise<IShareResult> {
    try {
      const exportResult = await exportService.exportToJchronic(observationId);

      if (!exportResult.success || !exportResult.content || !exportResult.fileName) {
        return {
          success: false,
          error: exportResult.error || "Erreur lors de l'export",
        };
      }

      return this.shareContent(exportResult.content, exportResult.fileName);
    } catch (error) {
      console.error('Error sharing chronicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Partage un contenu .jchronic déjà disponible (ex: téléchargé depuis le cloud)
   */
  async shareContent(content: string, fileName: string): Promise<IShareResult> {
    try {
      await this.cleanupOldTempFiles();

      const filePath = `${SHARE_TMP_DIR}/${fileName}`;

      await Filesystem.writeFile({
        path: filePath,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        url: uriResult.uri,
        dialogTitle: 'Partager la chronique',
      });

      return { success: true };
    } catch (error) {
      if (this.isShareCancelled(error)) {
        return { success: true };
      }

      console.error('Error sharing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Partage un contenu binaire (.chronic legacy) fourni en base64.
   *
   * CapacitorHttp renvoie les binaires en base64 ; sur Android, Base64.DEFAULT
   * insère des CRLF tous les 76 caractères qu'on strippe avant l'écriture.
   * On omet `encoding` : Filesystem writeFile décode alors la chaîne base64
   * en octets binaires (sinon elle serait écrite comme texte UTF-8).
   */
  async shareBinaryContent(base64Content: string, fileName: string): Promise<IShareResult> {
    try {
      await this.cleanupOldTempFiles();

      const cleanBase64 = base64Content.replace(/\s+/g, '');
      const filePath = `${SHARE_TMP_DIR}/${fileName}`;

      await Filesystem.writeFile({
        path: filePath,
        data: cleanBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        url: uriResult.uri,
        dialogTitle: 'Partager la chronique',
      });

      return { success: true };
    } catch (error) {
      if (this.isShareCancelled(error)) {
        return { success: true };
      }

      console.error('Error sharing binary file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private isShareCancelled(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes('cancel') || msg.includes('dismiss') || msg.includes('abort');
    }
    return false;
  }

  /**
   * Supprime les anciens fichiers temporaires de partage.
   * Appelé avant chaque nouveau partage (et non après), car Share.share()
   * résout dès que la share sheet s'ouvre — l'app destinataire peut encore
   * lire le fichier à ce moment-là.
   */
  private async cleanupOldTempFiles(): Promise<void> {
    try {
      const result = await Filesystem.readdir({
        path: SHARE_TMP_DIR,
        directory: Directory.Cache,
      });
      for (const file of result.files) {
        try {
          await Filesystem.deleteFile({
            path: `${SHARE_TMP_DIR}/${file.name}`,
            directory: Directory.Cache,
          });
        } catch {
          // Best-effort per-file cleanup
        }
      }
    } catch {
      // Directory may not exist yet on first share
    }
  }
}

export const shareService = new ShareService();
