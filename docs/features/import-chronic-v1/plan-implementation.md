# Plan d'implémentation - Import .chronic v1

## Objectif

Implémenter l'import de fichiers `.chronic` (format v1 binaire) dans ActoGraph v3, en s'appuyant sur le code prototype existant dans `docs/import-chronic-v1`.

## Contexte

- **Format actuel supporté** : `.jchronic` (v3) - Format JSON
- **Format à supporter** : `.chronic` (v1) - Format binaire Qt DataStream
- **Code prototype disponible** : Oui, dans `docs/import-chronic-v1`
- **Architecture cible** : NestJS backend avec service d'import existant

## Architecture proposée

### Structure des fichiers

```
api/src/core/observations/services/observation/import/
├── chronic-v1/
│   ├── parser/
│   │   ├── chronic-parser.ts          # Parse le fichier binaire
│   │   ├── protocol-parser.ts         # Parse le protocole
│   │   └── reading-parser.ts          # Parse les readings
│   ├── converter/
│   │   ├── protocol-converter.ts     # Convertit protocol v1 → format normalisé
│   │   └── reading-converter.ts       # Convertit readings v1 → format normalisé
│   ├── qtdatastream/                  # Bibliothèque Qt DataStream (copie du prototype)
│   └── types/
│       ├── chronic-v1.types.ts        # Types TypeScript pour v1
│       └── mappings.ts                # Mappings v1 → v3
└── index.ts                           # Service d'import mis à jour
```

## Étapes d'implémentation

### Phase 1 : Préparation et intégration de la bibliothèque Qt DataStream

#### 1.1 Copier la bibliothèque qtdatastream

**Fichiers à copier** :
- `docs/import-chronic-v1/chronic-file/services/import-export/chronic-file/qtdatastream/` → `api/src/core/observations/services/observation/import/chronic-v1/qtdatastream/`

**Actions** :
- Copier tous les fichiers du dossier qtdatastream
- Vérifier les dépendances (`int64-buffer`)
- Adapter les imports si nécessaire

**Vérifications** :
- ✅ La bibliothèque fonctionne avec Node.js
- ✅ Les types TypeScript sont corrects
- ✅ Pas de dépendances externes manquantes

#### 1.2 Copier les structures de données

**Fichiers à copier** :
- `chronic.ts` → `types/chronic-v1.types.ts`
- `protocol.ts` → `parser/protocol-parser.ts` (adapter)
- `reading.ts` → `parser/reading-parser.ts` (adapter)
- `mode-manager.ts` → `types/chronic-v1.types.ts` (intégrer)
- `extension-data.ts` → `types/chronic-v1.types.ts` (intégrer)

**Actions** :
- Adapter les imports pour utiliser la bibliothèque qtdatastream locale
- Créer des interfaces TypeScript propres
- Séparer les types des parsers

### Phase 2 : Création du parser principal

#### 2.1 Créer `chronic-parser.ts`

**Responsabilités** :
- Parser le fichier binaire `.chronic`
- Détecter la version (1, 2 ou 3)
- Coordonner le parsing des différentes sections

**Interface** :
```typescript
export class ChronicV1Parser {
  /**
   * Parse un fichier .chronic (v1) depuis un Buffer
   * @param buffer Buffer contenant le fichier binaire
   * @returns Objet IChronic parsé
   * @throws BadRequestException si le format est invalide ou la version non supportée
   */
  public parse(buffer: Buffer): IChronicV1 {
    // 1. Créer un CustomBuffer depuis le Buffer
    // 2. Lire la version
    // 3. Parser selon la version (1, 2 ou 3)
    // 4. Retourner l'objet IChronic
  }
}
```

**Points d'attention** :
- Gestion des erreurs de parsing
- Support des versions 1, 2 et 3
- Validation des données parsées

#### 2.2 Adapter les parsers de protocole et readings

**Actions** :
- Extraire la logique de parsing depuis les fichiers du prototype
- Créer des classes/modules dédiés
- Ajouter la gestion d'erreurs

### Phase 3 : Création des convertisseurs

#### 3.1 Créer `protocol-converter.ts`

**Responsabilités** :
- Convertir `IProtocolNode` (v1) → format normalisé pour `ObservationService.create()`
- Gérer la structure hiérarchique récursive
- Filtrer les métadonnées non pertinentes

**Interface** :
```typescript
export class ProtocolV1Converter {
  /**
   * Convertit un protocole v1 en format normalisé pour création
   * @param protocolNode Nœud racine du protocole v1
   * @returns Format normalisé avec categories/observables
   */
  public convert(protocolNode: IProtocolNodeV1): {
    name: string;
    description?: string;
    categories: Array<{
      name: string;
      description?: string;
      order?: number;
      observables?: Array<{
        name: string;
        description?: string;
        order?: number;
      }>;
    }>;
  } {
    // 1. Identifier le nœud racine
    // 2. Parcourir récursivement les enfants
    // 3. Convertir les catégories et observables
    // 4. Préserver l'ordre
  }
}
```

**Logique de conversion** :
- Nœud racine (`isRootNode = true`) → Ignoré
- Nœuds `type: 'category'` → Catégories
- Nœuds `type: 'observable'` → Observables dans la catégorie parente
- `indexInParentContext` → `order`
- Métadonnées d'affichage (positions, couleurs) → Ignorées

#### 3.2 Créer `reading-converter.ts`

**Responsabilités** :
- Convertir `IReadingEntry[]` (v1) → format normalisé
- Mapper les types (`flag` → `ReadingTypeEnum`)
- Convertir les dates

**Interface** :
```typescript
export class ReadingV1Converter {
  /**
   * Convertit les readings v1 en format normalisé
   * @param readings Liste des readings v1
   * @returns Format normalisé pour création
   */
  public convert(readings: IReadingEntryV1[]): Array<{
    name: string;
    description?: string;
    type: ReadingTypeEnum;
    dateTime: Date;
  }> {
    // 1. Mapper chaque reading
    // 2. Convertir flag → ReadingTypeEnum
    // 3. Préserver l'ordre
  }
  
  /**
   * Mappe le flag v1 vers ReadingTypeEnum
   */
  private mapFlagToType(flag: string): ReadingTypeEnum {
    // Mapping: 'start' → START, 'stop' → STOP, etc.
  }
}
```

**Mapping des types** :
- `flag: 'start'` → `ReadingTypeEnum.START`
- `flag: 'stop'` → `ReadingTypeEnum.STOP`
- `flag: 'pause_start'` → `ReadingTypeEnum.PAUSE_START`
- `flag: 'pause_end'` → `ReadingTypeEnum.PAUSE_END`
- `flag: 'data'` → `ReadingTypeEnum.DATA`
- Autres → `ReadingTypeEnum.DATA` (par défaut)

### Phase 4 : Intégration dans le service d'import existant

#### 4.1 Modifier `import.ts`

**Modifications** :
- Ajouter la détection du format `.chronic` dans `parseFile()`
- Appeler le parser v1 si format détecté
- Utiliser les convertisseurs pour normaliser les données

**Code** :
```typescript
public parseFile(
  fileContent: string | Buffer,  // Accepter Buffer pour v1
  fileName: string,
): { format: 'jchronic' | 'chronic'; data: IChronicImport | IChronicV1Import } {
  const extension = fileName.toLowerCase().endsWith('.jchronic')
    ? 'jchronic'
    : 'chronic';

  if (extension === 'jchronic') {
    // Format JSON existant
    // ...
  } else {
    // Format .chronic v1 - Binaire
    const buffer = Buffer.isBuffer(fileContent) 
      ? fileContent 
      : Buffer.from(fileContent, 'binary');
    
    const parser = new ChronicV1Parser();
    const chronic = parser.parse(buffer);
    
    return { format: 'chronic', data: chronic };
  }
}
```

#### 4.2 Adapter `normalizeImportData()`

**Modifications** :
- Ajouter le cas `format === 'chronic'`
- Utiliser les convertisseurs pour transformer les données

**Code** :
```typescript
if (format === 'chronic') {
  const data = parsedData as IChronicV1Import;
  
  // Convertir le protocole
  const protocolConverter = new ProtocolV1Converter();
  const protocolNormalized = protocolConverter.convert(data.protocol);
  
  // Convertir les readings
  const readingConverter = new ReadingV1Converter();
  const readingsNormalized = readingConverter.convert(data.reading.readings);
  
  return {
    observation: {
      name: data.name || 'Chronique importée',
      description: '', // Le format v1 n'a pas de description
    },
    protocol: protocolNormalized,
    readings: readingsNormalized,
  };
}
```

#### 4.3 Modifier le controller pour accepter les fichiers binaires

**Modifications** :
- Le controller reçoit déjà un `Express.Multer.File` avec un `buffer`
- Pas de modification nécessaire, le buffer est déjà disponible

### Phase 5 : Gestion des erreurs et validation

#### 5.1 Erreurs de parsing

**Scénarios** :
- Buffer invalide ou corrompu
- Version non supportée
- Structure de données incorrecte

**Gestion** :
- Try/catch autour du parsing
- Messages d'erreur clairs
- `BadRequestException` avec message descriptif

#### 5.2 Validation des données

**Validations** :
- Vérifier que le protocole existe
- Vérifier que le nom de l'observation est présent
- Vérifier que les readings sont valides
- Vérifier les types de readings

**Code** :
```typescript
private validateChronic(chronic: IChronicV1): void {
  if (!chronic.name) {
    throw new BadRequestException('Le fichier .chronic doit contenir un nom d\'observation');
  }
  
  if (!chronic.protocol) {
    throw new BadRequestException('Le fichier .chronic doit contenir un protocole');
  }
  
  if (!chronic.reading || !chronic.reading.readings) {
    throw new BadRequestException('Le fichier .chronic doit contenir des readings');
  }
}
```

### Phase 6 : Tests et documentation

#### 6.1 Tests unitaires

**Tests à créer** :
- Parser : parsing de fichiers v1, v2, v3
- Convertisseur protocole : conversion correcte de la hiérarchie
- Convertisseur readings : mapping correct des types
- Service d'import : intégration complète

**Fichiers de test** :
- `chronic-parser.spec.ts`
- `protocol-converter.spec.ts`
- `reading-converter.spec.ts`
- `import.spec.ts` (tests d'intégration)

#### 6.2 Tests d'intégration

**Scénarios** :
- Import d'un fichier `.chronic` v1 complet
- Vérification que l'observation est créée correctement
- Vérification que le protocole est créé avec la bonne structure
- Vérification que les readings sont créés dans le bon ordre

#### 6.3 Documentation

**Mise à jour** :
- `docs/chronic.md` : Ajouter la section sur l'import `.chronic` v1
- Commentaires dans le code
- README dans le dossier `chronic-v1/`

## Décisions techniques

### 1. Métadonnées non transférables

**Décision** : Les métadonnées spécifiques à v1 seront ignorées :
- Positions des boutons (bX, bY, bWidth, bHeight)
- Couleurs et formes
- Configuration du graphique
- Fichiers média (vidéo/audio)
- Mode calendar/chronometer

**Justification** : Ces métadonnées n'ont pas d'équivalent dans v3 et ne sont pas essentielles pour l'import.

### 2. Structure du protocole

**Décision** : Conversion récursive de l'arbre v1 vers la structure plate v3.

**Justification** : La structure v3 est plus simple et suffisante pour les besoins actuels.

### 3. Gestion des versions

**Décision** : Support des versions 1, 2 et 3 du format `.chronic`.

**Justification** : Le code prototype supporte déjà ces versions, pas de raison de les exclure.

### 4. Bibliothèque qtdatastream

**Décision** : Copier la bibliothèque dans le projet plutôt que d'utiliser un package npm.

**Justification** :
- La bibliothèque semble être un fork/copie
- Contrôle total sur les modifications
- Pas de dépendance externe supplémentaire

## Risques et mitigations

### Risque 1 : Complexité du format binaire

**Risque** : Le format binaire est complexe et peut être difficile à déboguer.

**Mitigation** :
- Utiliser le code prototype comme référence
- Ajouter des logs détaillés lors du parsing
- Créer des tests avec des fichiers réels

### Risque 2 : Incompatibilités de versions

**Risque** : Les différentes versions du format peuvent avoir des incompatibilités.

**Mitigation** :
- Tester chaque version séparément
- Gérer les différences de version explicitement
- Valider les données après parsing

### Risque 3 : Performance

**Risque** : Le parsing binaire peut être plus lent que le JSON.

**Mitigation** :
- Optimiser le parsing (éviter les copies inutiles)
- Tester avec des fichiers volumineux
- Ajouter des timeouts si nécessaire

### Risque 4 : Métadonnées perdues

**Risque** : Certaines métadonnées importantes peuvent être perdues lors de la conversion.

**Mitigation** :
- Documenter clairement ce qui est perdu
- Informer l'utilisateur si nécessaire
- Considérer l'ajout de ces métadonnées dans v3 si nécessaire

## Checklist d'implémentation

### Phase 1 : Préparation
- [ ] Copier la bibliothèque qtdatastream
- [ ] Vérifier les dépendances (int64-buffer)
- [ ] Copier les structures de données
- [ ] Adapter les imports

### Phase 2 : Parser
- [ ] Créer `chronic-parser.ts`
- [ ] Adapter `protocol-parser.ts`
- [ ] Adapter `reading-parser.ts`
- [ ] Tests unitaires des parsers

### Phase 3 : Convertisseurs
- [ ] Créer `protocol-converter.ts`
- [ ] Créer `reading-converter.ts`
- [ ] Implémenter les mappings
- [ ] Tests unitaires des convertisseurs

### Phase 4 : Intégration
- [ ] Modifier `parseFile()` pour détecter `.chronic`
- [ ] Modifier `normalizeImportData()` pour gérer v1
- [ ] Adapter le controller si nécessaire
- [ ] Tests d'intégration

### Phase 5 : Erreurs et validation
- [ ] Gestion des erreurs de parsing
- [ ] Validation des données
- [ ] Messages d'erreur clairs
- [ ] Tests d'erreurs

### Phase 6 : Tests et documentation
- [ ] Tests unitaires complets
- [ ] Tests d'intégration
- [ ] Documentation mise à jour
- [ ] Commentaires dans le code

## Estimation

### Temps estimé

- **Phase 1** : 2-3 heures (copie et adaptation)
- **Phase 2** : 4-6 heures (parsers)
- **Phase 3** : 3-4 heures (convertisseurs)
- **Phase 4** : 2-3 heures (intégration)
- **Phase 5** : 2-3 heures (erreurs et validation)
- **Phase 6** : 3-4 heures (tests et documentation)

**Total** : 16-23 heures

### Complexité

- **Complexité technique** : Moyenne à élevée (format binaire)
- **Risque** : Moyen (code prototype disponible)
- **Dépendances** : Bibliothèque qtdatastream

## Prochaines étapes

1. Valider le plan avec l'équipe
2. Commencer par la Phase 1 (préparation)
3. Tester chaque phase avant de passer à la suivante
4. Documenter au fur et à mesure

