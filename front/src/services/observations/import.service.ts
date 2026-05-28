import { observationService } from './index.service';
import { IObservation } from './interface';
import { serviceT } from 'src/i18n/service-translate';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

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
    if (!window.api || !window.api.readFile || !window.api.readFileBinary) {
      throw new Error(serviceT('services.electronRequired'));
    }

    const fileName = filePath.split(/[/\\]/).pop() || 'file.jchronic';
    const isLegacyChronic = fileName.toLowerCase().endsWith('.chronic');
    const readResult = isLegacyChronic
      ? await window.api.readFileBinary(filePath)
      : await window.api.readFile(filePath);

    // Vérification du résultat de la lecture
    if (!readResult.success || !readResult.data) {
      throw new Error(
        readResult.error || serviceT('services.fileReadFailed'),
      );
    }

    // ÉTAPE 2 : Créer un objet File à partir du contenu lu
    // L'objet File est nécessaire pour l'envoi via FormData au backend
    const file = isLegacyChronic
      ? new File([base64ToUint8Array(readResult.data)], fileName, {
          type: 'application/octet-stream',
        })
      : new File([readResult.data], fileName, {
          type: 'application/json',
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
