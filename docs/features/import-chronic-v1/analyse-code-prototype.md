# Analyse du code prototype - Import .chronic v1

## Vue d'ensemble

Le code prototype dans `docs/import-chronic-v1` contient une implémentation complète pour gérer le format `.chronic` v1, qui est un **format binaire** utilisant Qt DataStream pour la sérialisation. Ce format est très différent du format `.jchronic` v3 (JSON) actuellement supporté.

## Architecture du code prototype

### Structure des fichiers

```
chronic-file/
├── services/
│   ├── import-export/
│   │   ├── chronic-file/
│   │   │   ├── import-from-file/index.ts      # Point d'entrée import
│   │   │   ├── export-from-db/index.ts        # Point d'entrée export
│   │   │   ├── file-structure/
│   │   │   │   ├── chronic.ts                 # Structure principale
│   │   │   │   ├── protocol.ts                # Structure protocole
│   │   │   │   ├── reading.ts                 # Structure readings
│   │   │   │   ├── mode-manager.ts            # Gestionnaire de mode
│   │   │   │   ├── extension-data.ts          # Données d'extension
│   │   │   │   └── graph-manager/             # Gestionnaire de graphique
│   │   │   └── qtdatastream/                  # Bibliothèque Qt DataStream
│   │   └── index.ts                            # Service principal ImportExport
│   └── index.service.ts
└── controllers/
    └── index.controller.ts
```

## Format .chronic v1 - Structure binaire

### Caractéristiques principales

1. **Format binaire** : Utilise Qt DataStream pour la sérialisation
2. **Versions supportées** : Versions 1, 2 et 3 du format chronic
3. **Structure hiérarchique** : Protocol avec arbre de nœuds (catégories/observables)
4. **Readings** : Liste d'entrées avec métadonnées (média, flags, dates)

### Structure IChronic

```typescript
interface IChronic {
  version: number;                    // Version du format (1, 2 ou 3)
  name: string;                       // Nom de l'observation
  protocol: IProtocolNode;            // Protocole (arbre hiérarchique)
  reading: IReading;                  // Readings avec métadonnées média
  hasSaveFile: boolean;               // Présence d'un fichier de sauvegarde
  saveFile: string;                   // Chemin du fichier de sauvegarde
  modeManager: IModeManager;         // Mode (calendar/chronometer)
  graphManager: IGraphManager;        // Configuration du graphique
  autoPosButtons: boolean;            // Positionnement automatique des boutons
  extensionData: IExtensionData;      // Données d'extension
  scaleFactor: number;                 // Facteur d'échelle
  buttonsWidth: number;               // Largeur des boutons
}
```

### Structure IProtocolNode

```typescript
interface IProtocolNode {
  version?: number;
  name: string;                       // Nom du nœud
  type: string;                        // Type ('category', 'observable', 'root')
  isRootNode: boolean;                 // Est-ce le nœud racine
  colorName: string;                   // Nom de la couleur
  shape: string;                       // Forme (pour l'affichage)
  thickness: number;                   // Épaisseur
  isVisible: boolean;                  // Visibilité
  indexInParentContext: number;        // Ordre dans le parent
  isBackground: boolean;                // Est un fond
  backgroundCover: string;             // Couverture du fond
  backgroundMotif: number;             // Motif du fond
  bX: number;                          // Position X
  bY: number;                          // Position Y
  bWidth: number;                      // Largeur
  bHeight: number;                     // Hauteur
  children: IProtocolNode[];            // Enfants (récursif)
}
```

**Points importants** :
- Structure récursive : chaque nœud peut avoir des enfants
- Métadonnées d'affichage : positions, couleurs, formes (spécifiques à v1)
- Version 1 : pas de positions (bX, bY, bWidth, bHeight = -1)
- Version 2 : ajout des positions

### Structure IReading

```typescript
interface IReading {
  version?: number;
  hasLinkedVideoFile: boolean;        // Présence d'un fichier vidéo
  hasLinkedAudioFile: boolean;        // Présence d'un fichier audio
  mediaFilePath: string;              // Chemin du fichier média
  dataManagerType: string;            // Type de gestionnaire de données
  readings: IReadingEntry[];          // Liste des readings
}

interface IReadingEntry {
  version?: number;
  id: number;                          // ID du reading (version 3 uniquement)
  name: string;                        // Nom/libellé
  flag: string;                        // Type (équivalent à ReadingTypeEnum)
  time: Date;                          // Date/heure
}
```

**Points importants** :
- Version 1 et 2 : pas d'ID dans les entries
- Version 3 : ajout de l'ID
- Le champ `flag` correspond au type de reading (start, stop, data, etc.)
- Support des fichiers média (vidéo/audio)

### Structure IModeManager

```typescript
interface IModeManager {
  currentMode: 'calendar' | 'chronometer';  // Mode d'affichage temporel
}
```

### Structure IGraphManager

Contient la configuration du graphique avec :
- Layers (couches)
- Axes temporels (calendar/chronometer)
- Marges et formats

## Bibliothèque Qt DataStream

### Principe

Qt DataStream est un système de sérialisation binaire utilisé par Qt. Le code prototype utilise une bibliothèque Node.js (`qtdatastream`) pour lire/écrire ce format.

### Types supportés

- `QDouble` : Nombre flottant double précision
- `QString` : Chaîne de caractères (UTF-16)
- `QInt` : Entier 32 bits signé
- `QUInt` : Entier 32 bits non signé
- `QBool` : Booléen
- `QDateTime` : Date/heure (julian day + milliseconds)
- `QMap` : Dictionnaire clé-valeur
- `QList` : Liste

### Lecture depuis un Buffer

```typescript
// Exemple de lecture
const version = types.QDouble.read(buffer);
const name = types.QString.read(buffer);
const protocol = Protocol.importFromBuffer(buffer, {});
```

### Écriture vers un Buffer

```typescript
// Exemple d'écriture
Buffer.concat([buffer, new types.QDouble(version).toBuffer()]);
Buffer.concat([buffer, new types.QString(name).toBuffer()]);
```

## Processus d'import dans le prototype

### 1. Parsing du fichier binaire

```typescript
// import-from-file/index.ts
export const importChronic = (fileContent: Buffer): IChronic => {
  const customBuffer = new CustomBuffer(fileContent);
  const chronic = importFromBuffer(customBuffer, {});
  return chronic;
};
```

**Étapes** :
1. Conversion du Buffer en CustomBuffer (wrapper pour gestion du position)
2. Lecture séquentielle des données selon la version
3. Parsing récursif du protocole et des readings

### 2. Conversion en entités de base de données

Le service `ImportExport.importChronic()` convertit les données parsées en entités :

#### Observation

```typescript
const obsCreated = await this.observationsService.create.create({
  name: chronicName,
  description: '',
  dataMod: chronic.modeManager.currentMode,  // Calendar ou Chronometer
  saveFilePath: chronic.hasSaveFile ? chronic.saveFile : undefined,
  mediaPath: chronic.reading.mediaFilePath,
  hasLinkedAudioFile: chronic.reading.hasLinkedAudioFile,
  hasLinkedVideoFile: chronic.reading.hasLinkedVideoFile,
  // ... configuration graphique
});
```

#### Protocol

```typescript
// Création du protocole
const protocolCreated = await this.protocolService.create.create({
  name: protocolName,
  itemPosType: chronic.autoPosButtons ? 'auto' : 'manual',
  buttonWidth: chronic.buttonsWidth / 16,
  // ...
});

// Création récursive des items du protocole
await this.recursivelySaveProtocolItems(
  child,
  rootNodeItem.id,
  options.user,
  protocolCreated.id,
  i
);
```

**Points importants** :
- Création d'un nœud racine "root"
- Parcours récursif de l'arbre de protocole
- Préservation de l'ordre via `indexInParentContext`
- Conversion des métadonnées d'affichage (positions, couleurs, formes)

#### Readings

```typescript
for (const entry of reading.readings) {
  await this.readingService.create.create({
    label: entry.name,
    type: entry.flag,        // Conversion flag -> type
    datetime: entry.time,
    orderNumber: i,
    observation: { id: obsCreated.id },
  });
}
```

**Points importants** :
- Conversion du champ `flag` en `type`
- Préservation de l'ordre via `orderNumber`
- Les IDs ne sont pas préservés (nouveaux IDs générés)

## Différences avec le format .jchronic v3

| Aspect | .chronic v1 | .jchronic v3 |
|--------|-------------|--------------|
| **Format** | Binaire (Qt DataStream) | JSON textuel |
| **Lisible** | Non (binaire) | Oui (texte) |
| **Versions** | 1, 2, 3 | 1.0.0 |
| **IDs** | Inclus (mais ignorés à l'import) | Exclus |
| **Métadonnées graphique** | Incluses (positions, couleurs, formes) | Exclues |
| **Fichiers média** | Supportés (vidéo/audio) | Non supportés |
| **Mode** | Calendar/Chronometer | Non spécifié |
| **Extension** | `.chronic` | `.jchronic` |

## Mapping des données

### Protocol

**v1 → v3** :
- `IProtocolNode` → Structure `categories/observables`
- `type: 'category'` → Catégorie
- `type: 'observable'` → Observable dans une catégorie
- `children` → `observables` dans une catégorie
- Métadonnées d'affichage (positions, couleurs) → Ignorées dans v3

### Readings

**v1 → v3** :
- `flag` → `type` (ReadingTypeEnum)
- `name` → `name`
- `time` → `dateTime`
- `id` → Ignoré (nouveaux IDs générés)

### Observation

**v1 → v3** :
- `name` → `name`
- `description` → `description` (vide dans v1)
- `modeManager.currentMode` → Non mappé (spécifique à v1)
- `hasSaveFile` / `saveFile` → Non mappé (spécifique à v1)
- `mediaFilePath` → Non mappé (spécifique à v1)

## Points d'attention

### 1. Gestion des versions

Le format supporte 3 versions avec des différences :
- **Version 1** : Pas de positions dans le protocole, pas d'ID dans les readings
- **Version 2** : Ajout des positions dans le protocole
- **Version 3** : Ajout des IDs dans les readings, ajout de `extensionData`

### 2. Métadonnées non transférables

Certaines métadonnées du format v1 n'ont pas d'équivalent dans v3 :
- Positions des boutons (bX, bY, bWidth, bHeight)
- Couleurs et formes
- Configuration du graphique
- Fichiers média
- Mode calendar/chronometer

**Décision** : Ces métadonnées seront ignorées lors de l'import vers v3.

### 3. Structure hiérarchique du protocole

Le format v1 utilise une structure récursive avec un nœud racine, tandis que v3 utilise une structure plate avec catégories contenant des observables.

**Conversion nécessaire** :
- Identifier le nœud racine (isRootNode = true)
- Parcourir récursivement les enfants
- Convertir les nœuds de type 'category' en catégories
- Convertir les nœuds de type 'observable' en observables dans les catégories

### 4. Types de readings

Le champ `flag` dans v1 correspond au `type` dans v3. Il faut mapper :
- `flag: 'start'` → `type: ReadingTypeEnum.START`
- `flag: 'stop'` → `type: ReadingTypeEnum.STOP`
- `flag: 'data'` → `type: ReadingTypeEnum.DATA`
- etc.

### 5. Bibliothèque qtdatastream

La bibliothèque `qtdatastream` est nécessaire pour parser le format binaire. Elle doit être :
- Intégrée au projet (copie ou npm package)
- Compatible avec Node.js
- Capable de lire les types Qt DataStream

## Code réutilisable

### Fichiers à réutiliser

1. **qtdatastream/** : Bibliothèque complète pour Qt DataStream
   - Types de base (QString, QInt, QDouble, etc.)
   - Buffer personnalisé avec gestion de position
   - Utilitaires de conversion

2. **file-structure/** : Structures de données
   - `chronic.ts` : Structure principale et parsing
   - `protocol.ts` : Structure et parsing du protocole
   - `reading.ts` : Structure et parsing des readings
   - `mode-manager.ts` : Gestionnaire de mode
   - `extension-data.ts` : Données d'extension

3. **import-from-file/index.ts** : Point d'entrée pour l'import
   - Fonction `importChronic()` qui parse le Buffer

### Code à adapter

1. **Conversion en format v3** : Le code prototype crée directement des entités de base de données. Il faut adapter pour créer via le service d'import existant qui attend le format normalisé.

2. **Gestion des erreurs** : Ajouter une gestion d'erreurs robuste avec messages clairs.

3. **Validation** : Valider les données parsées avant conversion.

4. **Mapping des types** : Créer un mapping clair entre les types v1 et v3.

## Dépendances

### Bibliothèques nécessaires

- `qtdatastream` : Bibliothèque pour parser Qt DataStream (déjà dans le prototype)
- `int64-buffer` : Pour les entiers 64 bits (dépendance de qtdatastream)

### Compatibilité

- Node.js : Le code utilise `Buffer` natif de Node.js
- TypeScript : Le code est en TypeScript avec quelques `@ts-nocheck`

## Conclusion

Le code prototype fournit une base solide pour implémenter l'import `.chronic` v1. Les principaux défis seront :

1. **Intégration** : Adapter le code pour qu'il s'intègre dans l'architecture NestJS existante
2. **Conversion** : Convertir les données v1 vers le format normalisé attendu par le service d'import
3. **Mapping** : Mapper correctement les types et structures entre v1 et v3
4. **Gestion des métadonnées** : Décider quoi faire des métadonnées spécifiques à v1 (ignorer ou convertir)

Le code est bien structuré et modulaire, ce qui facilitera l'intégration.

