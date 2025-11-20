import { ObservationService } from '../index.service';
import { ProtocolService } from '../../protocol/index.service';
import { ReadingService } from '../../reading.service';
import { BadRequestException } from '@nestjs/common';
import { ReadingTypeEnum } from '../../../entities/reading.entity';
import { ProtocolItemTypeEnum } from '../../../entities/protocol.entity';
import { ChronicV1Parser } from './chronic-v1/parser/chronic-parser';
import { ProtocolV1Converter } from './chronic-v1/converter/protocol-converter';
import { ReadingV1Converter } from './chronic-v1/converter/reading-converter';
import { IChronicV1 } from './chronic-v1/types/chronic-v1.types';

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
 * 
 * Ce format est utilisé après parsing du fichier binaire .chronic.
 * Il contient la structure complète parsée depuis le fichier Qt DataStream.
 * 
 * @see IChronicV1 - Structure complète du fichier .chronic parsé
 */
interface IChronicV1Import {
  chronic: IChronicV1; // Structure complète parsée depuis le fichier binaire
}

export class Import {
  private chronicV1Parser: ChronicV1Parser;
  private protocolV1Converter: ProtocolV1Converter;
  private readingV1Converter: ReadingV1Converter;

  constructor(
    private readonly observationService: ObservationService,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
  ) {
    this.chronicV1Parser = new ChronicV1Parser();
    this.protocolV1Converter = new ProtocolV1Converter();
    this.readingV1Converter = new ReadingV1Converter();
  }

  /**
   * Parse le contenu d'un fichier et détecte son format
   * 
   * Cette méthode détecte automatiquement le format du fichier via son extension
   * et parse le contenu en conséquence :
   * 
   * **Format .jchronic (v3)** :
   * - Format JSON textuel lisible
   * - Parsing via JSON.parse()
   * - Validation des champs essentiels
   * 
   * **Format .chronic (v1)** :
   * - Format binaire Qt DataStream
   * - Parsing via ChronicV1Parser qui utilise la bibliothèque qtdatastream
   * - Support des versions 1, 2 et 3 du format
   * - Validation de la structure parsée
   * 
   * Le format est détecté via l'extension du fichier (.jchronic ou .chronic).
   * 
   * @param fileContent Contenu du fichier (string pour .jchronic, Buffer pour .chronic)
   * @param fileName Nom du fichier (pour détecter l'extension)
   * @returns Objet avec le format détecté ('jchronic' ou 'chronic') et les données parsées
   * @throws BadRequestException si le format est invalide, non supporté ou si le parsing échoue
   */
  public parseFile(
    fileContent: string | Buffer,
    fileName: string,
  ): { format: 'jchronic' | 'chronic'; data: IChronicImport | IChronicV1Import } {
    // Détecter le format via l'extension du fichier
    const extension = fileName.toLowerCase().endsWith('.jchronic')
      ? 'jchronic'
      : 'chronic';

    if (extension === 'jchronic') {
      // FORMAT .jchronic (v3) : Format JSON standard - SUPPORTÉ
      if (Buffer.isBuffer(fileContent)) {
        fileContent = fileContent.toString('utf-8');
      }
      
      try {
        const data = JSON.parse(fileContent as string) as IChronicImport;
        
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
      // FORMAT .chronic (v1) : Format binaire Qt DataStream - SUPPORTÉ
      // Le fichier .chronic est un format binaire qui utilise Qt DataStream pour la sérialisation.
      // Il doit être parsé avec la bibliothèque qtdatastream qui implémente le protocole Qt DataStream.
      
      if (typeof fileContent === 'string') {
        // Si c'est une string, convertir en Buffer (encodage binaire)
        // Cela peut arriver si le fichier a été lu comme texte au lieu de binaire
        fileContent = Buffer.from(fileContent, 'binary');
      }
      
      try {
        // Parser le fichier binaire avec le parser v1
        // Le parser va :
        // 1. Détecter la version du format (1, 2 ou 3)
        // 2. Parser séquentiellement toutes les sections (name, protocol, reading, etc.)
        // 3. Valider les données essentielles
        // 4. Retourner la structure IChronicV1 complète
        const chronic = this.chronicV1Parser.parse(fileContent as Buffer);
        
        return {
          format: 'chronic',
          data: {
            chronic,
          },
        };
      } catch (error) {
        // Si c'est déjà une BadRequestException, la relancer telle quelle
        // (elle contient déjà un message d'erreur descriptif)
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Sinon, encapsuler l'erreur dans une BadRequestException
        // avec un message descriptif pour l'utilisateur
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new BadRequestException(
          `Erreur lors du parsing du fichier .chronic : ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Normalise les données importées pour créer une observation
   * 
   * Cette fonction convertit le format d'import (.jchronic ou .chronic) en format interne
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
      // FORMAT .chronic v1 : Format binaire parsé
      // Le fichier .chronic a été parsé et contient maintenant une structure IChronicV1.
      // Il faut convertir cette structure vers le format normalisé attendu par ObservationService.create().
      
      const data = parsedData as IChronicV1Import;
      const chronic = data.chronic;

      // ÉTAPE 1 : Convertir le protocole v1 en format normalisé
      // Le protocole v1 utilise une structure récursive (arbre de nœuds),
      // tandis que v3 utilise une structure plate (catégories contenant des observables).
      // Le convertisseur va transformer la structure récursive en structure plate.
      let protocolNormalized: {
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
      } | undefined;

      if (chronic.protocol) {
        // Convertir la structure récursive en structure plate
        // - Nœud racine → ignoré
        // - Nœuds 'category' → catégories
        // - Nœuds 'observable' → observables dans leur catégorie parente
        // - Ordre préservé via indexInParentContext
        const protocolConverted = this.protocolV1Converter.convert(chronic.protocol);
        protocolNormalized = {
          name: protocolConverted.name,
          description: protocolConverted.description,
          categories: protocolConverted.categories.length > 0
            ? protocolConverted.categories
            : undefined,
        };
      }

      // ÉTAPE 2 : Convertir les readings v1 en format normalisé
      // Les readings v1 utilisent un champ 'flag' (texte) pour le type,
      // tandis que v3 utilise ReadingTypeEnum.
      // Le convertisseur va mapper les flags vers les types enum.
      const readingsNormalized = this.readingV1Converter.convert(
        chronic.reading?.readings || [],
      );

      // ÉTAPE 3 : Construire l'objet de retour avec les données normalisées
      return {
        observation: {
          name: chronic.name || 'Chronique importée',
          description: undefined, // Le format v1 n'a pas de description au niveau observation
        },
        protocol: protocolNormalized,
        readings: readingsNormalized,
      };
    }
  }

  /**
   * Importe une observation depuis un fichier .jchronic ou .chronic
   * 
   * Processus d'import complet :
   * 1. Parsing du fichier : détection du format et parsing
   *    - Si .chronic (v1) : parse le fichier binaire avec Qt DataStream
   *    - Si .jchronic (v3) : parse le JSON
   * 2. Normalisation : conversion du format d'import en format interne
   *    - Pour v1 : conversion du protocole et des readings via les convertisseurs
   *    - Pour v3 : conversion directe depuis le JSON
   * 3. Création : création de l'observation avec protocole et readings
   * 
   * Le service ObservationService.create() gère :
   * - La création de l'observation
   * - La création du protocole avec ses catégories et observables
   * - La création de tous les readings
   * - La génération automatique des nouveaux IDs
   * 
   * @param fileContent Contenu du fichier (string pour .jchronic, Buffer pour .chronic)
   * @param fileName Nom du fichier (pour détecter l'extension)
   * @param userId ID de l'utilisateur qui importe (propriétaire de la nouvelle observation)
   * @returns Observation créée avec toutes ses relations
   * @throws BadRequestException si le fichier est invalide ou le format non supporté
   */
  public async importFromFile(
    fileContent: string | Buffer,
    fileName: string,
    userId: number,
  ) {
    // ÉTAPE 1 : Parser le fichier
    // Détecte le format (.jchronic ou .chronic) et parse le JSON ou le binaire
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

