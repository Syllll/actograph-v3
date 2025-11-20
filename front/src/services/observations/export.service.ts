import { observationService } from './index.service';
import { IObservation } from './interface';
import { IChronicExport } from './export.interface';

/**
 * Service pour exporter une observation au format .jchronic via le backend
 * 
 * Ce service fait le pont entre le frontend et le backend pour l'export :
 * 1. Appelle l'API backend pour récupérer les données formatées
 * 2. Utilise l'API Electron pour sauvegarder le fichier localement
 * 3. Gère le dialogue de sauvegarde avec l'utilisateur
 */
export const exportService = {
  /**
   * Exporte une observation complète au format JSON (.jchronic)
   * 
   * Flux d'exécution :
   * 1. Vérification de la disponibilité de l'API Electron
   * 2. Validation de l'ID de l'observation
   * 3. Appel API backend pour récupérer les données formatées (sans IDs)
   * 4. Conversion en JSON formaté (avec indentation pour lisibilité)
   * 5. Génération d'un nom de fichier par défaut (basé sur le nom de l'observation)
   * 6. Ouverture du dialogue de sauvegarde dans le dossier Documents
   * 7. Écriture du fichier si l'utilisateur confirme
   * 
   * @param observation L'observation à exporter (doit avoir un ID)
   * @returns Promise qui résout avec le chemin du fichier sauvegardé ou null si annulé
   * @throws Error si l'API Electron n'est pas disponible ou si l'export échoue
   */
  async exportObservation(
    observation: IObservation
  ): Promise<string | null> {
    // VÉRIFICATION 1 : L'API Electron doit être disponible pour sauvegarder le fichier
    // Cette fonctionnalité nécessite Electron car elle utilise les APIs natives du système
    if (!window.api || !window.api.showSaveDialog || !window.api.writeFile) {
      throw new Error(
        'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.'
      );
    }

    // VÉRIFICATION 2 : L'observation doit avoir un ID pour être exportée
    // L'ID est nécessaire pour appeler l'API backend
    if (!observation.id) {
      throw new Error('Observation ID is required');
    }

    // ÉTAPE 1 : Récupérer les données d'export depuis le backend
    // Le backend s'occupe de :
    // - Charger l'observation avec toutes ses relations (protocol, readings)
    // - Vérifier les permissions (l'utilisateur doit être propriétaire)
    // - Retirer tous les IDs (observation, protocol, readings, items du protocole)
    // - Formater les dates en ISO 8601
    const exportData = await observationService.exportObservation(observation.id);

    // ÉTAPE 2 : Convertir les données en JSON avec indentation
    // L'indentation (2 espaces) rend le fichier lisible par un humain
    // Utile pour le débogage et la vérification manuelle
    const jsonContent = JSON.stringify(exportData, null, 2);

    // ÉTAPE 3 : Générer un nom de fichier par défaut
    // Format : {nom_observation}_{date}.jchronic
    // Exemple : ma_chronique_2024-01-15.jchronic
    const sanitizedFileName = observation.name
      .replace(/[^a-z0-9]/gi, '_') // Remplacer les caractères spéciaux par des underscores
      .toLowerCase() // Tout en minuscules pour compatibilité cross-platform
      .substring(0, 50); // Limiter à 50 caractères pour éviter les noms trop longs
    const defaultFileName = `${sanitizedFileName}_${new Date()
      .toISOString()
      .split('T')[0]}.jchronic`; // Date au format YYYY-MM-DD

    // ÉTAPE 4 : Ouvrir le dialogue de sauvegarde
    // Le dialogue s'ouvre dans le dossier Documents de l'utilisateur
    // L'utilisateur peut modifier le nom et l'emplacement du fichier
    const dialogResult = await window.api.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [
        { name: 'Fichiers Chronique', extensions: ['jchronic'] }, // Filtre principal
        { name: 'Tous les fichiers', extensions: ['*'] }, // Option pour forcer l'extension
      ],
    });

    // ÉTAPE 5 : Vérifier si l'utilisateur a annulé
    // Si l'utilisateur ferme le dialogue sans sauvegarder, on retourne null
    // Pas besoin de notification dans ce cas (comportement attendu)
    if (dialogResult.canceled || !dialogResult.filePath) {
      return null;
    }

    // ÉTAPE 6 : Écrire le fichier sur le disque
    // Le fichier est écrit en UTF-8 pour supporter tous les caractères
    const writeResult = await window.api.writeFile(
      dialogResult.filePath,
      jsonContent
    );

    // Vérification du résultat de l'écriture
    if (!writeResult.success) {
      throw new Error(
        writeResult.error || 'Erreur lors de l\'écriture du fichier'
      );
    }

    // Retourner le chemin du fichier sauvegardé pour affichage à l'utilisateur
    return dialogResult.filePath;
  },
};

