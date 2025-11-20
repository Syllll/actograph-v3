import { ObservationService } from './index.service';
import { ObservationRepository } from '../../repositories/obsavation.repository';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Format d'export d'une observation pour le fichier .jchronic
 * 
 * IMPORTANT : Ce format ne contient AUCUN ID de base de données pour permettre :
 * - La réimportation sans conflits d'IDs
 * - La portabilité entre différentes instances de l'application
 * - La compatibilité avec les futures versions
 * 
 * Structure :
 * - version : Version du format d'export (pour compatibilité future)
 * - exportedAt : Date/heure de l'export (ISO 8601)
 * - observation : Métadonnées de l'observation (sans ID)
 * - protocol : Protocole complet avec sa structure hiérarchique (sans IDs)
 * - readings : Tous les relevés associés (sans IDs)
 */
export interface IChronicExport {
  version: string;
  exportedAt: string;
  observation: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  protocol?: {
    name: string;
    description?: string;
    items?: any[];
  };
  readings?: Array<{
    name: string;
    description?: string;
    type: string;
    dateTime: string;
  }>;
}

export class Export {
  constructor(
    private readonly observationService: ObservationService,
    private readonly observationRepository: ObservationRepository,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
  ) {}

  /**
   * Exporte une observation au format .jchronic
   * 
   * Processus d'export :
   * 1. Récupération de l'observation avec ses relations (protocol, readings)
   * 2. Vérification des permissions (l'observation doit appartenir à l'utilisateur)
   * 3. Construction de l'objet d'export sans IDs
   * 4. Traitement récursif des items du protocole pour retirer les IDs
   * 5. Formatage des dates en ISO 8601
   * 
   * @param observationId ID de l'observation à exporter
   * @param userId ID de l'utilisateur (pour vérifier les permissions)
   * @returns Données au format JSON pour l'export (sans IDs)
   */
  public async exportObservation(
    observationId: number,
    userId: number,
  ): Promise<IChronicExport> {
    // ÉTAPE 1 : Récupérer l'observation avec toutes ses relations
    // On charge protocol et readings pour avoir toutes les données nécessaires
    // La clause where garantit que seul le propriétaire peut exporter son observation
    const observation = await this.observationService.findOne(observationId, {
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['protocol', 'readings'],
    });

    // Vérification de sécurité : l'observation doit exister
    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    // Vérification de validité : l'observation doit avoir un nom
    if (!observation.name) {
      throw new NotFoundException('Observation name is required');
    }

    // ÉTAPE 2 : Construire l'objet d'export de base (métadonnées de l'observation)
    // On retire tous les IDs et on convertit les dates en ISO 8601
    const exportData: IChronicExport = {
      version: '1.0.0', // Version du format pour compatibilité future
      exportedAt: new Date().toISOString(), // Horodatage de l'export
      observation: {
        name: observation.name,
        description: observation.description || undefined, // Convertir null en undefined pour JSON propre
        createdAt: observation.createdAt
          ? observation.createdAt.toISOString()
          : new Date().toISOString(), // Fallback si date manquante
        updatedAt: observation.updatedAt
          ? observation.updatedAt.toISOString()
          : new Date().toISOString(),
      },
    };

    // ÉTAPE 3 : Traiter le protocole si présent
    // Le protocole est stocké séparément, on doit le charger explicitement
    if (observation.protocol && observation.protocol.id) {
      const protocol = await this.protocolService.findOne(observation.protocol.id);
      
      if (protocol && protocol.name) {
        // Les items du protocole sont stockés en JSON dans la colonne items
        // Structure : tableau de catégories, chaque catégorie peut avoir des enfants (observables)
        let protocolItems: any[] = [];
        if (protocol.items) {
          try {
            // Parser le JSON stocké en base
            const parsedItems = JSON.parse(protocol.items);
            // IMPORTANT : Retirer récursivement tous les IDs des items et leurs enfants
            // Cela permet la réimportation sans conflits d'IDs
            protocolItems = this.removeIdsFromProtocolItems(parsedItems);
          } catch (e) {
            // Si le parsing échoue, on continue sans items plutôt que de faire échouer l'export
            console.error('Failed to parse protocol items:', e);
          }
        }

        // Ajouter le protocole à l'export (sans ID)
        exportData.protocol = {
          name: protocol.name,
          description: protocol.description || undefined,
          items: protocolItems, // Items sans IDs
        };
      }
    }

    // ÉTAPE 4 : Traiter les readings si présents
    // Les readings sont déjà chargés via la relation, on les formate pour l'export
    if (observation.readings && observation.readings.length > 0) {
      exportData.readings = observation.readings
        // Filtrer les readings invalides (sans nom)
        .filter((reading) => reading.name)
        // Mapper chaque reading en retirant l'ID et en formatant la date
        .map((reading) => ({
          name: reading.name!, // Le ! est sûr car on a filtré les valeurs nulles
          description: reading.description || undefined,
          type: reading.type, // Type du reading (start, stop, pause_start, pause_end, data)
          dateTime: reading.dateTime.toISOString(), // Format ISO 8601 pour portabilité
        }));
    }

    return exportData;
  }

  /**
   * Retire récursivement les IDs des items du protocole et de leurs enfants
   * 
   * Cette fonction traite la structure hiérarchique du protocole :
   * - Les catégories (type: 'category') peuvent contenir des enfants (observables)
   * - Les observables (type: 'observable') sont des feuilles de l'arbre
   * 
   * Pour chaque item :
   * 1. On crée un nouvel objet sans le champ 'id'
   * 2. On conserve tous les autres champs (type, name, description, action, order, meta)
   * 3. Si l'item a des enfants, on les traite récursivement
   * 
   * Pourquoi retirer les IDs ?
   * - Les IDs sont spécifiques à une instance de base de données
   * - Lors de l'import, de nouveaux IDs seront générés
   * - Cela évite les conflits et permet la portabilité
   * 
   * @param items Items du protocole avec IDs (peut contenir des catégories avec enfants)
   * @returns Items du protocole sans IDs, structure hiérarchique préservée
   */
  private removeIdsFromProtocolItems(items: any[]): any[] {
    return items.map((item) => {
      // Créer un nouvel objet avec les champs obligatoires (sans ID)
      const itemWithoutId: any = {
        type: item.type, // 'category' ou 'observable'
        name: item.name, // Nom de l'item (obligatoire)
      };

      // Ajouter les champs optionnels s'ils sont présents
      // Description : texte optionnel décrivant l'item
      if (item.description) {
        itemWithoutId.description = item.description;
      }

      // Action : type d'action pour les observables (continuous, discrete)
      if (item.action) {
        itemWithoutId.action = item.action;
      }

      // Order : position de l'item dans la liste (pour préserver l'ordre)
      if (item.order !== undefined) {
        itemWithoutId.order = item.order;
      }

      // Meta : métadonnées additionnelles (objet libre)
      if (item.meta) {
        itemWithoutId.meta = item.meta;
      }

      // TRAITEMENT RÉCURSIF : Si l'item est une catégorie avec des enfants (observables)
      // On applique la même fonction pour retirer les IDs des enfants
      // Cela permet de traiter des structures profondes (catégories > observables > sous-items si besoin)
      if (item.children && Array.isArray(item.children)) {
        itemWithoutId.children = this.removeIdsFromProtocolItems(item.children);
      }

      return itemWithoutId;
    });
  }
}

