# Chronic - Import, Export et Création

Ce document décrit la gestion des données chroniques (readings) dans ActoGraph v3, incluant leur création, import et export.

## Vue d'ensemble

Les **readings** (données chroniques) sont les enregistrements de données collectés lors d'une observation. Chaque reading représente un événement ou une mesure à un moment précis dans le temps.

## Structure d'un Reading

### Entité Reading

```typescript
interface Reading {
  id?: number;              // ID unique (généré par le backend)
  tempId?: string;          // ID temporaire (pour les readings non sauvegardés)
  observationId: number;    // ID de l'observation parente
  name: string;             // Libellé du reading
  description?: string;      // Description optionnelle
  type: ReadingTypeEnum;    // Type du reading
  dateTime: Date;           // Date et heure précise
  createdAt?: Date;         // Date de création
  updatedAt?: Date;         // Date de mise à jour
}
```

### Types de Readings

Les readings peuvent être de différents types :

```typescript
enum ReadingTypeEnum {
  START = 'start',           // Début d'une période
  STOP = 'stop',             // Fin d'une période
  PAUSE_START = 'pause_start', // Début d'une pause
  PAUSE_END = 'pause_end',   // Fin d'une pause
  DATA = 'data',             // Donnée standard
}
```

## Création de Readings

### Création individuelle

**Backend :**
```typescript
const reading = await readingService.create({
  name: 'Événement 1',
  description: 'Description de l\'événement',
  observationId: 1,
  type: ReadingTypeEnum.DATA,
  dateTime: new Date('2024-01-15T10:30:00'),
});
```

**Frontend :**
```typescript
import { readingService } from '@services/observations/reading.service';

const reading = await readingService.createMany({
  observationId: 1,
  readings: [{
    name: 'Événement 1',
    description: 'Description',
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2024-01-15T10:30:00'),
  }],
});
```

### Création multiple

Pour créer plusieurs readings en une seule requête :

```typescript
const readings = await readingService.createMany({
  observationId: 1,
  readings: [
    {
      name: 'Début observation',
      type: ReadingTypeEnum.START,
      dateTime: new Date('2024-01-15T09:00:00'),
    },
    {
      name: 'Événement 1',
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2024-01-15T09:15:00'),
    },
    {
      name: 'Fin observation',
      type: ReadingTypeEnum.STOP,
      dateTime: new Date('2024-01-15T10:00:00'),
    },
  ],
});
```

### Création avec ID temporaire

Pour les readings créés localement avant synchronisation :

```typescript
const tempId = uuidv4(); // Générer un ID temporaire unique

const reading = {
  tempId: tempId,
  name: 'Nouveau reading',
  type: ReadingTypeEnum.DATA,
  dateTime: new Date(),
  observationId: 1,
};

// Le tempId permet de corréler le reading local avec celui créé sur le serveur
```

## Synchronisation

### Principe

Le système utilise une synchronisation optimiste :
1. Les readings sont créés/modifiés localement avec un `tempId`
2. La synchronisation se fait en arrière-plan
3. Les `tempId` sont remplacés par les vrais `id` après création sur le serveur

### Synchronisation automatique

Le composable `use-readings` gère la synchronisation automatique :

```typescript
import { useReadings } from '@composables/use-observation/use-readings';

const { methods } = useReadings({ sharedStateFromObservation });

// Synchroniser manuellement
await methods.synchronizeReadings();
```

**Processus de synchronisation :**

1. **Identification des changements** :
   - Readings nouveaux (avec `tempId` mais sans `id`)
   - Readings modifiés (présents dans les deux états mais différents)
   - Readings supprimés (présents dans l'état initial mais absents de l'état actuel)

2. **Création** : Les nouveaux readings sont créés avec `createMany()`

3. **Mise à jour** : Les readings modifiés sont mis à jour avec `updateMany()`

4. **Suppression** : Les readings supprimés sont supprimés avec `deleteMany()`

5. **Mise à jour de l'état** : L'état initial est synchronisé avec l'état actuel

### Gestion des erreurs et retry

La synchronisation inclut une logique de retry en cas d'échec :

```typescript
const executeWithRetry = async (operation, operationName, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

## Import de données

### Format CSV

Pour importer des readings depuis un fichier CSV, le format attendu est :

```csv
name,description,type,dateTime
Début observation,,start,2024-01-15T09:00:00.000Z
Événement 1,Description,data,2024-01-15T09:15:00.000Z
Fin observation,,stop,2024-01-15T10:00:00.000Z
```

### Format Excel

Le format Excel suit la même structure que le CSV, avec les colonnes :
- `name` : Libellé du reading
- `description` : Description (optionnel)
- `type` : Type du reading (start, stop, pause_start, pause_end, data)
- `dateTime` : Date et heure au format ISO 8601

### Processus d'import

1. **Parsing du fichier** : Lecture et parsing du CSV/Excel
2. **Validation** : Vérification du format et des données
3. **Création** : Création des readings via `createMany()`
4. **Association** : Association à l'observation cible

### Exemple d'import

```typescript
// Parser le fichier CSV/Excel
const fileData = await parseFile(file);

// Valider et transformer les données
const readings = fileData.map(row => ({
  name: row.name,
  description: row.description || null,
  type: ReadingTypeEnum[row.type.toUpperCase()],
  dateTime: new Date(row.dateTime),
}));

// Créer les readings
await readingService.createMany({
  observationId: observationId,
  readings: readings,
});
```

## Export de données

### Export CSV

```typescript
import { exportData } from '@lib-improba/utils/export.utils';

await exportData({
  type: 'csv',
  fileName: 'readings_export',
  worksheets: [{
    name: 'Readings',
    columns: [
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Date/Heure', key: 'dateTime', width: 25 },
    ],
    rows: readings.map(r => ({
      name: r.name,
      description: r.description || '',
      type: r.type,
      dateTime: formatDateTime(r.dateTime),
    })),
  }],
});
```

### Export Excel

```typescript
await exportData({
  type: 'excel',
  fileName: 'readings_export',
  worksheets: [{
    name: 'Readings',
    columns: [
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Date/Heure', key: 'dateTime', width: 25 },
    ],
    rows: readings,
  }],
});
```

### Export avec dialogue de sauvegarde

```typescript
import { exportDataWithDialog } from '@lib-improba/utils/export.utils';

await exportDataWithDialog({
  type: 'excel',
  defaultFileName: 'readings_export',
  worksheets: [/* ... */],
});
```

## Gestion des Readings dans l'interface

### Table des Readings

La table des readings (`ReadingsTable.vue`) permet :

- **Visualisation** : Affichage de tous les readings d'une observation
- **Édition inline** : Modification directe dans la table
- **Sélection** : Sélection d'un reading pour actions
- **Tri** : Tri par colonnes (date, type, nom)
- **Filtrage** : Recherche dans les readings

### Édition

Les readings peuvent être édités directement dans la table :

- **Type** : Sélection dans une liste déroulante
- **Date/Heure** : Éditeur de date/heure avec calendrier et horloge
- **Nom** : Édition texte inline
- **Description** : Édition texte inline

Les modifications sont sauvegardées automatiquement lors de la synchronisation.

### Création

Pour créer un nouveau reading :

1. Cliquer sur le bouton "Ajouter"
2. Remplir les champs (nom, type, date/heure)
3. Le reading est créé avec un `tempId`
4. Synchronisation automatique en arrière-plan

### Suppression

Pour supprimer un reading :

1. Sélectionner le reading dans la table
2. Cliquer sur "Supprimer"
3. Le reading est marqué pour suppression
4. Synchronisation automatique en arrière-plan

## API Backend

### Endpoints

**Créer des readings :**
```
POST /observations/readings
Body: {
  observationId: number,
  readings: Reading[]
}
```

**Mettre à jour des readings :**
```
PATCH /observations/readings
Body: {
  observationId: number,
  readings: Reading[]
}
```

**Supprimer des readings :**
```
POST /observations/readings/delete
Body: {
  observationId: number,
  ids: number[]
}
```

**Récupérer les readings (paginé) :**
```
GET /observations/readings/paginate?observationId=1&offset=0&limit=100
```

## Bonnes pratiques

### Format des dates

- Utilisez toujours le format ISO 8601 pour les dates/heures
- Incluez les millisecondes pour la précision : `2024-01-15T09:15:30.123Z`
- Respectez le fuseau horaire (UTC recommandé)

### Gestion des tempId

- Générez des `tempId` uniques avec `uuid`
- Conservez le `tempId` même après création pour la corrélation
- Utilisez le `tempId` pour identifier les readings non synchronisés

### Performance

- Utilisez `createMany()` pour créer plusieurs readings en une fois
- Limitez le nombre de readings synchronisés par batch
- Utilisez la pagination pour les grandes listes

### Validation

- Validez toujours les données avant création
- Vérifiez que les dates sont dans un ordre logique
- Vérifiez que les types sont valides
- Vérifiez que l'observation existe

## Dépannage

### Readings non synchronisés

Si des readings restent avec un `tempId` :

1. Vérifiez les logs de synchronisation
2. Vérifiez la connexion réseau
3. Vérifiez les erreurs dans la console
4. Tentez une synchronisation manuelle

### Erreurs de format de date

Si vous recevez des erreurs de format de date :

1. Vérifiez que le format est ISO 8601
2. Vérifiez que la date est valide
3. Vérifiez le fuseau horaire

### Problèmes d'import

Si l'import échoue :

1. Vérifiez le format du fichier (CSV/Excel)
2. Vérifiez que toutes les colonnes requises sont présentes
3. Vérifiez que les types sont valides
4. Vérifiez que les dates sont au bon format

