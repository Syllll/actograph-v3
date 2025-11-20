import { observationService } from './index.service';
import { IObservation } from './interface';

/**
 * Service pour importer une observation depuis un fichier .jchronic ou .chronic via le backend
 * 
 * Ce service fait le pont entre le frontend et le backend pour l'import :
 * 1. Lit le fichier localement via l'API Electron
 * 2. Envoie le fichier au backend pour traitement
 * 3. Le backend parse, normalise et crée l'observation avec toutes ses relations
 */
export const importService = {
  /**
   * Importe une observation depuis un fichier .jchronic ou .chronic
   * 
   * Flux d'exécution :
   * 1. Vérification de la disponibilité de l'API Electron
   * 2. Lecture du fichier depuis le système de fichiers
   * 3. Création d'un objet File pour l'envoi au backend
   * 4. Appel API backend qui gère :
   *    - Le parsing du fichier (détection du format)
   *    - La normalisation des données
   *    - La création de l'observation avec protocole et readings
   *    - La génération des nouveaux IDs
   * 
   * @param filePath Chemin complet du fichier à importer
   * @returns Observation créée avec toutes ses relations (protocol, readings)
   * @throws Error si l'API Electron n'est pas disponible ou si l'import échoue
   */
  async importFromFile(filePath: string): Promise<IObservation> {
    // VÉRIFICATION 1 : L'API Electron doit être disponible pour lire le fichier
    // Cette fonctionnalité nécessite Electron car elle utilise les APIs natives du système
    if (!window.api || !window.api.readFile) {
      throw new Error(
        'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.'
      );
    }

    // ÉTAPE 1 : Lire le fichier depuis le système de fichiers
    // Le fichier est lu en UTF-8 pour supporter tous les caractères
    const readResult = await window.api.readFile(filePath);

    // Vérification du résultat de la lecture
    if (!readResult.success || !readResult.data) {
      throw new Error(
        readResult.error || 'Erreur lors de la lecture du fichier'
      );
    }

    // ÉTAPE 2 : Créer un objet File à partir du contenu lu
    // L'objet File est nécessaire pour l'envoi via FormData au backend
    // On extrait le nom du fichier depuis le chemin complet
    const fileName = filePath.split(/[/\\]/).pop() || 'chronique.jchronic';
    const file = new File([readResult.data], fileName, {
      type: 'application/json', // Type MIME pour les fichiers JSON
    });

    // ÉTAPE 3 : Envoyer le fichier au backend pour import
    // Le backend gère tout le processus :
    // - Parsing du fichier (détection .jchronic vs .chronic)
    // - Validation du format JSON
    // - Normalisation des données (conversion structure)
    // - Création de l'observation avec protocole et readings
    // - Génération automatique des nouveaux IDs
    const observation = await observationService.importObservation(file);

    return observation;
  },
};
