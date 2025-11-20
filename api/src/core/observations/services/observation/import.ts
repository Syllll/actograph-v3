import { ObservationService } from './index.service';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { BadRequestException } from '@nestjs/common';
import { ReadingTypeEnum } from '../../entities/reading.entity';
import { ProtocolItemTypeEnum } from '../../entities/protocol.entity';

/**
 * Format d'import pour les fichiers .jchronic (v3)
 * 
 * Ce format correspond exactement au format d'export IChronicExport.
 * Les fichiers .jchronic sont des fichiers JSON contenant :
 * - Les métadonnées de l'observation (sans ID)
 * - Le protocole complet avec sa structure hiérarchique (sans IDs)
 * - Tous les readings associés (sans IDs)
 * 
 * IMPORTANT : Ce format ne contient AUCUN ID pour permettre :
 * - La réimportation sans conflits
 * - La portabilité entre instances
 * - La création de nouvelles entités avec de nouveaux IDs
 */
export interface IChronicImport {
  version?: string; // Version du format (ex: '1.0.0')
  exportedAt?: string; // Date d'export (ISO 8601)
  observation: {
    name: string;
    description?: string;
    createdAt?: string; // Date de création originale (ISO 8601)
    updatedAt?: string; // Date de mise à jour originale (ISO 8601)
  };
  protocol?: {
    name: string;
    description?: string;
    items?: Array<{
      type: string; // 'category' ou 'observable'
      name: string;
      description?: string;
      action?: string; // Pour les observables : 'continuous' ou 'discrete'
      order?: number; // Ordre dans la liste
      meta?: Record<string, any>; // Métadonnées additionnelles
      children?: Array<{
        // Structure récursive pour les observables dans les catégories
        type: string;
        name: string;
        description?: string;
        action?: string;
        order?: number;
        meta?: Record<string, any>;
      }>;
    }>;
  };
  readings?: Array<{
    name: string;
    description?: string;
    type: string; // 'start', 'stop', 'pause_start', 'pause_end', 'data'
    dateTime: string; // Date/heure (ISO 8601)
  }>;
}

/**
 * Format d'import pour les fichiers .chronic (v1)
 */
interface IChronicV1Import {
  observation?: {
    name?: string;
    description?: string;
  };
  readings?: Array<{
    name: string;
    description?: string;
    type: string;
    dateTime: string;
  }>;
  [key: string]: any;
}

export class Import {
  constructor(
    private readonly observationService: ObservationService,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
  ) {}

  /**
   * Parse le contenu d'un fichier et détecte son format
   * 
   * Détection du format :
   * - .jchronic : Format JSON de la v3 (format actuel) - SUPPORTÉ
   * - .chronic : Format de la v1 (legacy) - NON SUPPORTÉ (renvoie une erreur)
   * 
   * Le format est détecté via l'extension du fichier.
   * 
   * IMPORTANT : Les fichiers .chronic (v1) ne sont pas encore supportés.
   * Si un fichier .chronic est détecté, une erreur est renvoyée immédiatement
   * sans tentative de parsing.
   * 
   * @param fileContent Contenu du fichier (string)
   * @param fileName Nom du fichier (pour détecter l'extension)
   * @returns Objet avec le format détecté et les données parsées
   * @throws BadRequestException si le format est .chronic (non supporté) ou si le JSON est invalide
   */
  public parseFile(
    fileContent: string,
    fileName: string,
  ): { format: 'jchronic' | 'chronic'; data: IChronicImport | IChronicV1Import } {
    // Détecter le format via l'extension du fichier
    const extension = fileName.toLowerCase().endsWith('.jchronic')
      ? 'jchronic'
      : 'chronic';

    if (extension === 'jchronic') {
      // FORMAT .jchronic (v3) : Format JSON standard - SUPPORTÉ
      try {
        const data = JSON.parse(fileContent) as IChronicImport;
        
        // Validation basique : vérifier que les champs essentiels sont présents
        if (!data.observation || !data.observation.name) {
          throw new BadRequestException(
            'Format .jchronic invalide : champ observation.name manquant',
          );
        }
        
        return { format: 'jchronic', data };
      } catch (error) {
        // Si c'est déjà une BadRequestException, la relancer
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Sinon, c'est une erreur de parsing JSON
        throw new BadRequestException(
          'Erreur lors du parsing du fichier .jchronic : format JSON invalide',
        );
      }
    } else {
      // FORMAT .chronic (v1) : Format legacy - NON SUPPORTÉ
      // Détection explicite du format .chronic et renvoi d'une erreur claire
      // sans tentative de parsing
      throw new BadRequestException(
        'Le format .chronic (v1) n\'est pas encore supporté. ' +
        'Veuillez utiliser un fichier .jchronic (v3) ou convertir votre fichier .chronic en .jchronic.',
      );
    }
  }

  /**
   * Normalise les données importées pour créer une observation
   * 
   * Cette fonction convertit le format d'import (.jchronic) en format interne
   * attendu par le service ObservationService.create().
   * 
   * Transformations effectuées :
   * 1. Observation : extraction des métadonnées (name, description)
   * 2. Protocol : conversion de la structure items (catégories/observables) 
   *    en format categories/observables attendu par le service
   *    - Préservation de l'ordre via le champ order
   *    - Préservation des métadonnées (action, meta) des observables
   * 3. Readings : conversion des dates ISO en objets Date
   *    - Validation des types de readings
   * 
   * @param parsedData Données parsées depuis le fichier
   * @param format Format du fichier source ('jchronic' ou 'chronic')
   * @returns Données normalisées pour création d'observation
   */
  public normalizeImportData(
    parsedData: IChronicImport | IChronicV1Import,
    format: 'jchronic' | 'chronic',
  ): {
    observation: {
      name: string;
      description?: string;
    };
    protocol?: {
      name: string;
      description?: string;
      categories?: Array<{
        name: string;
        description?: string;
        order?: number;
        observables?: Array<{
          name: string;
          description?: string;
          action?: string;
          meta?: Record<string, any>;
          order?: number;
        }>;
      }>;
    };
    readings: Array<{
      name: string;
      type: ReadingTypeEnum;
      dateTime: Date;
      description?: string;
    }>;
  } {
    if (format === 'jchronic') {
      const data = parsedData as IChronicImport;
      
      // ÉTAPE 1 : Traiter le protocole si présent
      // Le format .jchronic stocke les items dans une structure hiérarchique
      // (catégories avec enfants = observables)
      // On doit convertir cela en format categories/observables pour le service create()
      let protocolCategories: Array<{
        name: string;
        description?: string;
        order?: number;
        observables?: Array<{
          name: string;
          description?: string;
          action?: string;
          meta?: Record<string, any>;
          order?: number;
        }>;
      }> = [];
      
      if (data.protocol?.items) {
        // Trier les items par ordre si présent (pour préserver l'ordre d'origine)
        const sortedItems = [...data.protocol.items].sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : Infinity;
          const orderB = b.order !== undefined ? b.order : Infinity;
          return orderA - orderB;
        });
        
        for (const item of sortedItems) {
          // Ne traiter que les catégories (les observables sont dans children)
          if (item.type === ProtocolItemTypeEnum.Category) {
            // Traiter les observables (enfants de la catégorie)
            const observables: Array<{
              name: string;
              description?: string;
              action?: string;
              meta?: Record<string, any>;
              order?: number;
            }> = [];
            
            if (item.children && Array.isArray(item.children)) {
              // Trier les observables par ordre si présent
              const sortedChildren = [...item.children].sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : Infinity;
                const orderB = b.order !== undefined ? b.order : Infinity;
                return orderA - orderB;
              });
              
              for (const child of sortedChildren) {
                // Ne traiter que les observables
                if (child.type === ProtocolItemTypeEnum.Observable) {
                  observables.push({
                    name: child.name,
                    description: child.description,
                    action: child.action, // Préserver l'action (continuous/discrete)
                    meta: child.meta, // Préserver les métadonnées
                    order: child.order, // Préserver l'ordre
                  });
                }
              }
            }
            
            protocolCategories.push({
              name: item.name,
              description: item.description,
              order: item.order, // Préserver l'ordre de la catégorie
              observables: observables.length > 0 ? observables : undefined,
            });
          }
        }
      }

      // ÉTAPE 2 : Construire l'objet de retour avec les données normalisées
      return {
        observation: {
          name: data.observation.name,
          description: data.observation.description,
        },
        protocol: data.protocol
          ? {
              name: data.protocol.name,
              description: data.protocol.description,
              categories: protocolCategories.length > 0 ? protocolCategories : undefined,
            }
          : undefined,
        readings: (data.readings || []).map((reading) => {
          // Convertir la date ISO en objet Date
          // Valider que le type est un ReadingTypeEnum valide
          const readingType = reading.type as ReadingTypeEnum;
          
          return {
            name: reading.name,
            description: reading.description,
            type: readingType,
            dateTime: new Date(reading.dateTime), // Conversion ISO -> Date
          };
        }),
      };
    } else {
      // FORMAT .chronic v1 : Format legacy (traitement simplifié)
      const data = parsedData as IChronicV1Import;
      return {
        observation: {
          name: data.observation?.name || 'Chronique importée',
          description: data.observation?.description,
        },
        protocol: undefined, // Le format v1 pourrait ne pas avoir de protocole
        readings: (data.readings || []).map((reading) => ({
          name: reading.name,
          description: reading.description,
          type: reading.type as ReadingTypeEnum,
          dateTime: new Date(reading.dateTime),
        })),
      };
    }
  }

  /**
   * Importe une observation depuis un fichier .jchronic ou .chronic
   * 
   * Processus d'import complet :
   * 1. Parsing du fichier : détection du format et parsing JSON
   *    - Si .chronic (v1) : renvoie une erreur immédiatement (non supporté)
   *    - Si .jchronic (v3) : parse le JSON et continue
   * 2. Normalisation : conversion du format d'import en format interne
   * 3. Création : création de l'observation avec protocole et readings
   * 
   * Le service ObservationService.create() gère :
   * - La création de l'observation
   * - La création du protocole avec ses catégories et observables
   * - La création de tous les readings
   * - La génération automatique des nouveaux IDs
   * 
   * IMPORTANT : Les fichiers .chronic (v1) ne sont pas encore supportés.
   * Si un fichier .chronic est détecté, une erreur est renvoyée dès l'étape de parsing.
   * 
   * @param fileContent Contenu du fichier (string JSON)
   * @param fileName Nom du fichier (pour détecter l'extension)
   * @param userId ID de l'utilisateur qui importe (propriétaire de la nouvelle observation)
   * @returns Observation créée avec toutes ses relations
   * @throws BadRequestException si le fichier est .chronic (non supporté), invalide ou le format non supporté
   */
  public async importFromFile(
    fileContent: string,
    fileName: string,
    userId: number,
  ) {
    // ÉTAPE 1 : Parser le fichier
    // Détecte le format (.jchronic ou .chronic) et parse le JSON
    // Si le format est .chronic, une erreur est renvoyée immédiatement
    const { format, data } = this.parseFile(fileContent, fileName);

    // ÉTAPE 2 : Normaliser les données
    // Convertit le format d'import en format attendu par ObservationService.create()
    // - Structure protocol items -> categories/observables
    // - Dates ISO -> objets Date
    // - Préservation de l'ordre et des métadonnées
    // Note : Cette étape ne sera jamais atteinte pour les fichiers .chronic
    // car une erreur est renvoyée dans parseFile()
    const normalizedData = this.normalizeImportData(data, format);

    // ÉTAPE 3 : Créer l'observation avec toutes ses données
    // Le service create() gère la création en cascade :
    // 1. Crée l'observation
    // 2. Crée le protocole (si présent)
    // 3. Crée les catégories dans l'ordre
    // 4. Crée les observables dans chaque catégorie
    // 5. Crée tous les readings
    // Tous les nouveaux IDs sont générés automatiquement
    const observation = await this.observationService.create({
      userId,
      name: normalizedData.observation.name,
      description: normalizedData.observation.description,
      protocol: normalizedData.protocol,
      readings: normalizedData.readings,
    });

    return observation;
  }
}

