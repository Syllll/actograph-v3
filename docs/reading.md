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

### Mode chronomètre

Lorsqu'une observation est en mode **chronomètre** (défini lors de la création), les dates sont affichées et éditées comme des **durées** depuis un point de référence (t0 = 9 février 1989).

#### Affichage des durées

En mode chronomètre, la colonne "Date & heure" devient "Durée" et affiche les durées au format compact :
- Format : `Xj Yh Zm Ws Vms` (ex: `2j 3h 15m 30s 500ms`)
- Seules les unités non nulles sont affichées
- Exemples :
  - `1h 30m 15s 200ms` : 1 heure, 30 minutes, 15 secondes, 200 millisecondes
  - `45s 500ms` : 45 secondes, 500 millisecondes
  - `2j 5h` : 2 jours, 5 heures

#### Édition des durées

L'éditeur de durée en mode chronomètre inclut :
- Champs séparés pour chaque unité : jours, heures, minutes, secondes, millisecondes
- Validation des valeurs (heures 0-23, minutes 0-59, secondes 0-59, millisecondes 0-999)
- Conversion automatique entre durée et date lors de la sauvegarde
- La durée est convertie en date selon la formule : `date = t0 + durée`

#### Synchronisation avec la vidéo

En mode chronomètre avec une vidéo chargée :
- Le temps de la vidéo est synchronisé avec `elapsedTime` de l'observation
- Les readings créés utilisent automatiquement le temps actuel de la vidéo
- Les encoches sur la timeline de la vidéo correspondent aux readings
- Les boutons s'activent automatiquement selon la position de la vidéo
- **Performance optimisée** : Utilisation du protocole `file://` pour streaming natif (pas de chargement en mémoire)
- **Vérification de taille** : Avertissement automatique pour fichiers volumineux (>500 MB)

Voir la documentation de la feature [intégration vidéo](../features/integration-video/integration-video.md) pour plus de détails.

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

### Mode chronomètre

En mode chronomètre, les dates sont stockées normalement en base de données (format ISO 8601), mais sont affichées et manipulées comme des durées depuis t0 (9 février 1989).

**Important** :
- Le mode d'une observation est **figé** une fois choisi lors de la création
- Les dates sont toujours stockées en format ISO 8601 dans la base de données
- La conversion entre durée et date se fait automatiquement dans l'interface utilisateur
- Le t0 est fixé au **9 février 1989 à 00:00:00 UTC**

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

## Mode chronomètre et intégration vidéo

### Vue d'ensemble

Le mode chronomètre permet de travailler avec des durées au lieu de dates calendaires. Ce mode est particulièrement utile lors de l'analyse de vidéos, où les événements sont mesurés en temps relatif depuis le début de la vidéo.

### Activation du mode chronomètre

Le mode chronomètre est défini lors de la création d'une observation :
- Sélectionnez "Chronomètre" dans le champ "Mode de la chronique"
- Le mode est **figé** une fois l'observation créée
- Une fois en mode chronomètre, toutes les dates sont affichées comme des durées

### Point de référence (t0)

- **Date t0** : 9 février 1989 à 00:00:00 UTC
- Toutes les durées sont calculées depuis cette date
- La conversion se fait automatiquement : `date = t0 + durée`

### Format des durées

Les durées sont affichées au format compact :
- `Xj Yh Zm Ws Vms` où :
  - `j` = jours
  - `h` = heures
  - `m` = minutes
  - `s` = secondes
  - `ms` = millisecondes
- Seules les unités non nulles sont affichées
- Exemple : `2j 3h 15m 30s 500ms`

### Synchronisation avec la vidéo

Lorsqu'une vidéo est chargée en mode chronomètre :
- Le temps de la vidéo (`video.currentTime`) est synchronisé avec `elapsedTime`
- Les readings créés utilisent automatiquement le temps actuel de la vidéo
- Les encoches sur la timeline de la vidéo indiquent la position des readings
- Les boutons s'activent automatiquement selon la position de la vidéo

### Création de readings en mode chronomètre

Les readings créés en mode chronomètre utilisent automatiquement :
- `currentDate` : Date calculée comme t0 + elapsedTime
- `elapsedTime` : Temps écoulé depuis le début de l'observation

Cela garantit que les readings sont correctement synchronisés avec la vidéo si elle est chargée.

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

### Problèmes en mode chronomètre

Si les durées ne s'affichent pas correctement :

1. Vérifiez que l'observation est bien en mode chronomètre (`mode === 'chronometer'`)
2. Vérifiez que le t0 est correct (9 février 1989)
3. Vérifiez que les dates sont valides dans la base de données
4. Vérifiez la console pour les erreurs de conversion

### Problèmes de synchronisation vidéo

Si la vidéo n'est pas synchronisée avec les readings :

1. Vérifiez que l'observation est en mode chronomètre
2. Vérifiez que le fichier vidéo existe et est accessible
3. Vérifiez que les readings ont des dates valides
4. Vérifiez la console pour les erreurs de synchronisation

### Problèmes de performance

Si la table est lente :

1. Vérifiez que le virtual scroll est activé
2. Limitez le nombre de readings chargés
3. Utilisez la pagination
4. Optimisez les requêtes de base de données

