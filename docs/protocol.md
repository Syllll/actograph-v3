# Protocoles

Ce document décrit la gestion des protocoles d'observation dans ActoGraph v3.

## Vue d'ensemble

Un **protocole** définit la structure hiérarchique d'une observation. Il organise les éléments observables en catégories et observables, créant une arborescence qui guide la collecte de données.

## Structure d'un Protocole

### Entité Protocol

```typescript
interface Protocol {
  id?: number;                    // ID unique
  name?: string;                  // Nom du protocole
  description?: string;           // Description
  observationId: number;          // ID de l'observation associée
  items: ProtocolItem[];          // Structure hiérarchique (stockée en JSON)
  user?: User;                    // Utilisateur propriétaire
}
```

### Structure hiérarchique (ProtocolItem)

Un protocole est composé d'items qui peuvent être soit des **catégories**, soit des **observables** :

```typescript
interface ProtocolItem {
  id: string;                     // ID unique de l'item (UUID)
  name: string;                   // Nom de l'item
  description?: string;            // Description optionnelle
  type: ProtocolItemTypeEnum;     // 'category' ou 'observable'
  action?: ProtocolItemActionEnum; // Action associée (optionnel)
  meta?: Record<string, any>;     // Métadonnées (optionnel)
  children?: ProtocolItem[];      // Enfants (pour les catégories)
  order?: number;                 // Ordre d'affichage
}
```

### Types d'items

```typescript
enum ProtocolItemTypeEnum {
  Category = 'category',      // Catégorie (peut contenir des observables)
  Observable = 'observable',  // Observable (feuille de l'arbre)
}
```

### Actions

Les items peuvent avoir une action associée :

```typescript
enum ProtocolItemActionEnum {
  // Actions possibles pour les observables
  // (défini selon les besoins métier)
}
```

## Création d'un Protocole

### Création basique

**Backend :**
```typescript
const protocol = await protocolService.create({
  name: 'Protocole d\'observation',
  description: 'Description du protocole',
  observationId: 1,
});
```

**Frontend :**
```typescript
import { protocolService } from '@services/observations/protocol.service';

const protocol = await protocolService.create({
  observationId: 1,
  name: 'Protocole d\'observation',
  description: 'Description',
});
```

### Création avec structure complète

Lors de la création d'une observation, un protocole peut être créé avec sa structure complète :

```typescript
const observation = await observationService.create({
  userId: 1,
  name: 'Nouvelle observation',
  protocol: {
    name: 'Protocole complet',
    categories: [
      {
        name: 'Catégorie 1',
        description: 'Description catégorie 1',
        observables: [
          { name: 'Observable 1.1' },
          { name: 'Observable 1.2' },
        ],
      },
      {
        name: 'Catégorie 2',
        observables: [
          { name: 'Observable 2.1' },
        ],
      },
    ],
  },
});
```

## Gestion des Items

### Ajouter une catégorie

**Backend :**
```typescript
const category = await protocolService.items.addCategory({
  protocolId: 1,
  name: 'Nouvelle catégorie',
  description: 'Description',
  order: 0,
  action: ProtocolItemActionEnum.SOME_ACTION, // Optionnel
});
```

**Frontend :**
```typescript
const category = await protocolService.addCategory({
  protocolId: 1,
  name: 'Nouvelle catégorie',
  description: 'Description',
  order: 0,
});
```

### Ajouter un observable

Un observable doit toujours être associé à une catégorie parente :

**Backend :**
```typescript
const observable = await protocolService.items.addObservable({
  protocolId: 1,
  categoryId: 'uuid-de-la-categorie',
  name: 'Nouvel observable',
  description: 'Description',
  order: 0,
});
```

**Frontend :**
```typescript
const observable = await protocolService.addObservable({
  protocolId: 1,
  categoryId: 'uuid-de-la-categorie',
  name: 'Nouvel observable',
  description: 'Description',
  order: 0,
});
```

### Modifier un item

**Backend :**
```typescript
await protocolService.items.editItem({
  protocolId: 1,
  itemId: 'uuid-de-l-item',
  name: 'Nom modifié',
  description: 'Description modifiée',
});
```

**Frontend :**
```typescript
await protocolService.editItem({
  protocolId: 1,
  itemId: 'uuid-de-l-item',
  name: 'Nom modifié',
  description: 'Description modifiée',
});
```

### Supprimer un item

**Backend :**
```typescript
await protocolService.items.removeItem({
  protocolId: 1,
  itemId: 'uuid-de-l-item',
});
```

**Frontend :**
```typescript
await protocolService.removeItem({
  protocolId: 1,
  itemId: 'uuid-de-l-item',
});
```

## Stockage des Items

Les items sont stockés dans la colonne `items` du protocole sous forme de JSON :

```json
[
  {
    "id": "uuid-1",
    "name": "Catégorie 1",
    "type": "category",
    "order": 0,
    "children": [
      {
        "id": "uuid-2",
        "name": "Observable 1.1",
        "type": "observable",
        "order": 0
      }
    ]
  }
]
```

### Structure JSON

Le format JSON respecte la structure hiérarchique :
- Les catégories contiennent un tableau `children`
- Les observables sont des feuilles (pas de `children`)
- L'ordre est préservé via le champ `order`

## Récupération d'un Protocole

### Récupération simple

```typescript
const protocol = await protocolService.findOne(protocolId);
```

### Récupération avec relations

```typescript
const protocol = await protocolService.findOne(protocolId, {
  relations: ['observation', 'user'],
});
```

### Récupération avec items parsés

Le service parse automatiquement le JSON des items :

```typescript
const protocol = await protocolService.findOne(protocolId);
// protocol.items est un tableau de ProtocolItem[]
```

## Clonage de Protocole

Un protocole peut être cloné vers une autre observation :

**Backend :**
```typescript
const clonedProtocol = await protocolService.clone({
  protocolId: 1,
  observationIdToCopyTo: 2,
  newUserId: 1,
});
```

Cela crée une copie complète du protocole avec tous ses items, associée à la nouvelle observation.

## Utilisation dans l'interface

### Éditeur de protocole

L'interface permet de :
- Visualiser la structure hiérarchique
- Ajouter/modifier/supprimer des catégories et observables
- Réorganiser les items par glisser-déposer
- Éditer les propriétés (nom, description, action)

### Arborescence

La structure est affichée sous forme d'arbre :
```
📁 Catégorie 1
  ├─ 📄 Observable 1.1
  └─ 📄 Observable 1.2
📁 Catégorie 2
  └─ 📄 Observable 2.1
```

## API Backend

### Endpoints

**Créer un protocole :**
```
POST /observations/protocols
Body: {
  observationId: number,
  name: string,
  description?: string
}
```

**Ajouter un item :**
```
POST /observations/protocols/item
Body: {
  protocolId: number,
  name: string,
  type: 'category' | 'observable',
  parentId?: string,  // Requis pour les observables
  description?: string,
  order?: number
}
```

**Modifier un item :**
```
PATCH /observations/protocols/item/:id
Body: {
  name?: string,
  description?: string,
  action?: string,
  meta?: object
}
```

**Supprimer un item :**
```
DELETE /observations/protocols/item/:id?protocolId=1
```

**Récupérer un protocole :**
```
GET /observations/protocols/:id
```

**Récupérer les protocoles (paginé) :**
```
GET /observations/protocols/paginate?offset=0&limit=100
```

## Validation et Contrôles

### Vérifications

Avant d'ajouter un observable :
- La catégorie parente doit exister
- La catégorie parente doit être du type `category`
- L'ID de la catégorie parente doit être valide

Avant de modifier/supprimer un item :
- L'item doit exister dans le protocole
- L'utilisateur doit avoir accès à l'observation associée

### Permissions

- Seul le propriétaire de l'observation peut modifier le protocole
- Les protocoles sont privés à chaque utilisateur

## Bonnes pratiques

### Structure hiérarchique

- Limitez la profondeur de l'arborescence (2-3 niveaux recommandés)
- Utilisez des noms clairs et descriptifs
- Organisez logiquement les observables en catégories

### Performance

- Évitez les protocoles avec un très grand nombre d'items
- Utilisez l'ordre (`order`) pour contrôler l'affichage
- Limitez la taille des métadonnées (`meta`)

### Nommage

- Utilisez des noms courts mais descriptifs
- Respectez une convention de nommage cohérente
- Utilisez les descriptions pour plus de détails

## Dépannage

### Items non sauvegardés

Si les modifications ne sont pas sauvegardées :

1. Vérifiez que le protocole existe
2. Vérifiez les permissions d'accès
3. Vérifiez le format JSON des items
4. Consultez les logs du backend

### Erreurs de structure

Si vous recevez des erreurs de structure :

1. Vérifiez que les observables ont un parent valide
2. Vérifiez que les IDs sont des UUID valides
3. Vérifiez que le JSON est valide

### Problèmes d'affichage

Si l'arborescence ne s'affiche pas correctement :

1. Vérifiez que les items sont bien parsés
2. Vérifiez que la structure hiérarchique est correcte
3. Vérifiez que l'ordre (`order`) est défini

