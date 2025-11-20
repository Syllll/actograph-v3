# Readings

Ce document décrit en détail la gestion des readings (données chroniques) dans ActoGraph v3.

## Vue d'ensemble

Les **readings** sont les enregistrements de données collectés lors d'une observation. Chaque reading représente un événement ou une mesure à un moment précis dans le temps, permettant de construire une chronologie complète de l'observation.

## Modèle de données

### Entité Reading

```typescript
@Entity('readings')
export class Reading extends BaseEntity {
  @ManyToOne(() => Observation)
  observation?: Observation;

  @Column({ type: 'text', nullable: true })
  @Index('IDX_readings_name')
  name?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    enum: ReadingTypeEnum,
    default: ReadingTypeEnum.DATA,
    nullable: false,
  })
  type!: ReadingTypeEnum;

  @Column({ nullable: false })
  @Index()
  dateTime!: Date;

  @Column({ type: 'text', nullable: true })
  @Index()
  tempId?: string | null;
}
```

### Types de Readings

```typescript
enum ReadingTypeEnum {
  START = 'start',           // Début de l'observation
  STOP = 'stop',             // Fin de l'observation
  PAUSE_START = 'pause_start', // Début d'une pause
  PAUSE_END = 'pause_end',   // Fin d'une pause
  DATA = 'data',             // Donnée standard
}
```

## Création de Readings

### Création simple

```typescript
import { ReadingService } from '@core/observations/services/reading.service';

const reading = await readingService.create({
  name: 'Événement observé',
  description: 'Description détaillée',
  observationId: 1,
  type: ReadingTypeEnum.DATA,
  dateTime: new Date('2024-01-15T10:30:00.000Z'),
});
```

### Création multiple

Pour créer plusieurs readings en une seule transaction :

```typescript
const readings = await readingService.createMany([
  {
    name: 'Début',
    observationId: 1,
    type: ReadingTypeEnum.START,
    dateTime: new Date('2024-01-15T09:00:00.000Z'),
  },
  {
    name: 'Événement 1',
    observationId: 1,
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2024-01-15T09:15:00.000Z'),
  },
  {
    name: 'Fin',
    observationId: 1,
    type: ReadingTypeEnum.STOP,
    dateTime: new Date('2024-01-15T10:00:00.000Z'),
  },
]);
```

### Création avec ID temporaire

Pour les readings créés localement avant synchronisation :

```typescript
import { v4 as uuidv4 } from 'uuid';

const tempId = uuidv4();

const reading = {
  tempId: tempId,
  name: 'Reading local',
  type: ReadingTypeEnum.DATA,
  dateTime: new Date(),
  observationId: 1,
};
```

## Gestion de l'état

### Composable use-readings

Le composable `use-readings` gère l'état local des readings :

```typescript
import { useReadings } from '@composables/use-observation/use-readings';

const { sharedState, methods } = useReadings({
  sharedStateFromObservation: observationState,
});

// État actuel des readings
const currentReadings = sharedState.currentReadings;

// Charger les readings
await methods.loadReadings(observation);

// Synchroniser avec le serveur
await methods.synchronizeReadings();
```

### État initial vs État actuel

Le système maintient deux états :

- **État initial** (`stateless.initialReadings`) : État au dernier chargement depuis le serveur
- **État actuel** (`sharedState.currentReadings`) : État avec les modifications locales

La synchronisation compare ces deux états pour identifier les changements.

## Synchronisation

### Principe de synchronisation

La synchronisation suit un modèle optimiste :

1. **Modifications locales** : Les readings sont modifiés localement immédiatement
2. **Identification des changements** : Comparaison entre état initial et état actuel
3. **Envoi au serveur** : Envoi des changements par batch
4. **Mise à jour** : Mise à jour de l'état initial après succès

### Processus détaillé

```typescript
async synchronizeReadings() {
  // 1. Identifier les nouveaux readings
  const newReadings = currentReadings.filter(r => 
    !r.id && r.tempId && 
    !initialReadings.find(ir => ir.tempId === r.tempId)
  );

  // 2. Identifier les readings modifiés
  const updatedReadings = currentReadings.filter(r => {
    if (!r.id) return false;
    const initial = initialReadings.find(ir => ir.id === r.id);
    return initial && hasChanged(initial, r);
  });

  // 3. Identifier les readings supprimés
  const deletedReadings = initialReadings.filter(ir => 
    ir.id && !currentReadings.find(r => r.id === ir.id)
  );

  // 4. Créer les nouveaux readings
  if (newReadings.length > 0) {
    const created = await readingService.createMany({
      observationId: obsId,
      readings: newReadings,
    });
    // Corréler les tempId avec les vrais IDs
    mergeIds(created, currentReadings);
  }

  // 5. Mettre à jour les readings modifiés
  if (updatedReadings.length > 0) {
    await readingService.updateMany({
      observationId: obsId,
      readings: updatedReadings,
    });
  }

  // 6. Supprimer les readings supprimés
  if (deletedReadings.length > 0) {
    await readingService.deleteMany({
      observationId: obsId,
      ids: deletedReadings.map(r => r.id),
    });
  }

  // 7. Mettre à jour l'état initial
  stateless.initialReadings = [...currentReadings];
}
```

### Gestion des erreurs et retry

La synchronisation inclut une logique de retry :

```typescript
const executeWithRetry = async (
  operation: () => Promise<any>,
  operationName: string,
  maxRetries = 3
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed ${operationName} after ${maxRetries} attempts`);
        throw error;
      }
      // Attendre avant de réessayer (backoff exponentiel)
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * attempt)
      );
    }
  }
};
```

### Synchronisation automatique

La synchronisation peut être déclenchée automatiquement :

- Après un délai d'inactivité (debounce)
- Lors de la fermeture de la page
- Manuellement par l'utilisateur

```typescript
// Synchronisation avec debounce
let syncTimeoutId: number | null = null;

function scheduleSync() {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }
  syncTimeoutId = setTimeout(() => {
    methods.synchronizeReadings();
    syncTimeoutId = null;
  }, 2000); // 2 secondes d'inactivité
}
```

## Récupération des Readings

### Récupération paginée

```typescript
const response = await readingService.findWithPagination(
  {
    offset: 0,
    limit: 100,
    order: 'ASC',
    orderBy: 'dateTime',
  },
  {
    observationId: 1,
    searchString: 'recherche', // Optionnel
  }
);

const readings = response.results;
const total = response.total;
```

### Filtrage et recherche

Les readings peuvent être filtrés par :
- `observationId` : Readings d'une observation spécifique
- `searchString` : Recherche textuelle dans le nom et la description
- `type` : Filtrage par type de reading
- `dateTime` : Filtrage par plage de dates

### Tri

Les readings peuvent être triés par :
- `dateTime` : Date/heure (recommandé pour l'ordre chronologique)
- `name` : Nom alphabétique
- `type` : Type de reading
- `createdAt` : Date de création

## Modification des Readings

### Mise à jour individuelle

```typescript
await readingService.updateMany({
  observationId: 1,
  readings: [{
    id: 123,
    name: 'Nom modifié',
    description: 'Description modifiée',
    type: ReadingTypeEnum.DATA,
    dateTime: new Date('2024-01-15T10:30:00.000Z'),
  }],
});
```

### Mise à jour multiple

```typescript
await readingService.updateMany({
  observationId: 1,
  readings: [
    { id: 1, name: 'Reading 1 modifié', /* ... */ },
    { id: 2, name: 'Reading 2 modifié', /* ... */ },
  ],
});
```

## Suppression des Readings

### Suppression multiple

```typescript
await readingService.deleteMany({
  observationId: 1,
  ids: [123, 124, 125],
});
```

### Suppression logique

Les readings sont supprimés de manière logique (soft delete) :
- Le reading n'est pas physiquement supprimé de la base de données
- Il est marqué comme supprimé
- Il n'apparaît plus dans les requêtes normales

## Interface utilisateur

### Table des Readings

La table (`ReadingsTable.vue`) offre :

- **Affichage** : Liste de tous les readings avec colonnes configurables
- **Édition inline** : Modification directe dans la table
- **Sélection** : Sélection d'un reading pour actions
- **Tri** : Tri par colonnes
- **Virtual scroll** : Performance optimisée pour de grandes listes

### Colonnes de la table

- **Ordre** : Numéro de ligne
- **Type** : Type du reading (éditable)
- **Date/Heure** : Date et heure précise (éditable)
- **Nom** : Libellé du reading (éditable)
- **Description** : Description (éditable)

### Éditeur de date/heure

L'éditeur de date/heure inclut :
- Sélecteur de date (calendrier)
- Sélecteur d'heure (horloge)
- Support des millisecondes
- Format : `DD/MM/YYYY HH:mm:ss.SSS`

### Sélection

La table supporte la sélection d'un reading :
- Clic sur une ligne pour sélectionner
- Reading sélectionné mis en surbrillance
- Actions disponibles sur le reading sélectionné

## API Backend

### Endpoints

**Créer des readings :**
```
POST /observations/readings
Body: {
  observationId: number,
  readings: Array<{
    tempId?: string,
    name: string,
    description?: string,
    type: ReadingTypeEnum,
    dateTime: string, // ISO 8601
    createdAt?: string,
    updatedAt?: string
  }>
}
```

**Mettre à jour des readings :**
```
PATCH /observations/readings
Body: {
  observationId: number,
  readings: Array<{
    id: number,
    name: string,
    description?: string,
    type: ReadingTypeEnum,
    dateTime: string
  }>
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
GET /observations/readings/paginate
Query params:
  - observationId: number
  - offset: number
  - limit: number
  - order: 'ASC' | 'DESC'
  - orderBy: string
  - searchString?: string
```

## Bonnes pratiques

### Format des dates

- Utilisez toujours le format ISO 8601 : `2024-01-15T10:30:00.000Z`
- Incluez les millisecondes pour la précision
- Utilisez UTC pour éviter les problèmes de fuseau horaire

### Gestion des tempId

- Générez des `tempId` uniques avec `uuid`
- Conservez le `tempId` même après création pour la corrélation
- Utilisez le `tempId` pour identifier les readings non synchronisés

### Performance

- Utilisez la pagination pour les grandes listes
- Limitez le nombre de readings synchronisés par batch
- Utilisez `createMany()` / `updateMany()` / `deleteMany()` pour les opérations multiples

### Validation

- Validez les données avant création
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

Si vous recevez des erreurs de format :

1. Vérifiez que le format est ISO 8601
2. Vérifiez que la date est valide
3. Vérifiez le fuseau horaire

### Problèmes de performance

Si la table est lente :

1. Vérifiez que le virtual scroll est activé
2. Limitez le nombre de readings chargés
3. Utilisez la pagination
4. Optimisez les requêtes de base de données

