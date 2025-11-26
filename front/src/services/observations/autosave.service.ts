import { observationService } from './index.service';
import { IObservation } from './interface';

/**
 * Service pour l'autosave des observations
 * 
 * Ce service gère la sauvegarde automatique périodique des observations
 * dans un dossier temporaire pour permettre la restauration en cas de crash.
 */
export const autosaveService = {
  /**
   * Exporte une observation dans le dossier autosave sans dialogue utilisateur
   * 
   * @param observation L'observation à sauvegarder
   * @returns Promise qui résout avec le chemin du fichier sauvegardé ou null si erreur
   */
  async saveToAutosave(observation: IObservation): Promise<string | null> {
    // Vérification de l'API Electron
    if (!window.api || !window.api.getAutosaveFolder || !window.api.writeFile) {
      console.warn('Autosave: Electron API not available');
      return null;
    }

    // Vérification de l'ID de l'observation
    if (!observation.id) {
      console.warn('Autosave: Observation ID is required');
      return null;
    }

    try {
      // Récupérer les données d'export depuis le backend
      const exportData = await observationService.exportObservation(observation.id);

      // Convertir en JSON
      const jsonContent = JSON.stringify(exportData, null, 2);

      // Obtenir le dossier autosave
      const autosaveFolder = await window.api.getAutosaveFolder();

      // Générer un nom de fichier avec timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedFileName = observation.name
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 50);
      const fileName = `autosave_${observation.id}_${sanitizedFileName}_${timestamp}.jchronic`;
      const filePath = `${autosaveFolder}/${fileName}`;

      // Écrire le fichier
      const writeResult = await window.api.writeFile(filePath, jsonContent);

      if (!writeResult.success) {
        console.error('Autosave: Failed to write file:', writeResult.error);
        return null;
      }

      return filePath;
    } catch (error) {
      console.error('Autosave: Error saving observation:', error);
      return null;
    }
  },

  /**
   * Liste les fichiers autosave disponibles
   * 
   * @returns Promise avec la liste des fichiers autosave
   */
  async listAutosaveFiles(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
  }>> {
    if (!window.api || !window.api.listAutosaveFiles) {
      return [];
    }

    try {
      const result = await window.api.listAutosaveFiles();
      return result.success ? (result.files || []) : [];
    } catch (error) {
      console.error('Autosave: Error listing files:', error);
      return [];
    }
  },

  /**
   * Supprime un fichier autosave
   * 
   * @param filePath Chemin du fichier à supprimer
   */
  async deleteAutosaveFile(filePath: string): Promise<boolean> {
    if (!window.api || !window.api.deleteAutosaveFile) {
      return false;
    }

    try {
      const result = await window.api.deleteAutosaveFile(filePath);
      return result.success;
    } catch (error) {
      console.error('Autosave: Error deleting file:', error);
      return false;
    }
  },

  /**
   * Nettoie les fichiers autosave anciens
   * 
   * @param maxAgeDays Nombre de jours maximum (défaut: 7)
   */
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<number> {
    if (!window.api || !window.api.cleanupOldAutosave) {
      return 0;
    }

    try {
      const result = await window.api.cleanupOldAutosave(maxAgeDays);
      return result.success ? result.deleted : 0;
    } catch (error) {
      console.error('Autosave: Error cleaning up files:', error);
      return 0;
    }
  },
};

