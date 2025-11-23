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

**Mise à jour partielle (recommandée)**

Les mises à jour sont **partielles** par défaut : seuls les champs fournis sont modifiés, les autres sont préservés.

**Backend :**
```typescript
// Mise à jour complète
await protocolService.items.editCategory({
  protocolId: 1,
  categoryId: 'uuid-de-la-categorie',
  name: 'Nom modifié',
  description: 'Description modifiée',
  action: ProtocolItemActionEnum.Continuous,
});

// Mise à jour partielle : seulement la position dans meta
await protocolService.items.editCategory({
  protocolId: 1,
  categoryId: 'uuid-de-la-categorie',
  meta: {
    position: { x: 100, y: 200 }
  }
});
// Le nom, la description et les autres champs restent inchangés
```

**Frontend :**
```typescript
// Mise à jour complète
await protocolService.editProtocolItem({
  id: 'uuid-de-l-item',
  protocolId: 1,
  type: ProtocolItemTypeEnum.Category,
  name: 'Nom modifié',
  description: 'Description modifiée',
});

// Mise à jour partielle : seulement meta
await protocolService.editProtocolItem({
  id: 'uuid-de-l-item',
  protocolId: 1,
  type: ProtocolItemTypeEnum.Category,
  meta: {
    ...existingMeta,
    position: { x: 100, y: 200 }
  }
});
```

**Important :**
- Les champs non fournis (`undefined`) ne sont **pas** envoyés au backend
- Les valeurs existantes sont **automatiquement préservées**
- Seuls les champs explicitement fournis sont mis à jour
- Cela permet des mises à jour ciblées (ex: position, métadonnées) sans risquer d'écraser d'autres données

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
  protocolId: number,      // Requis
  type: 'category' | 'observable',  // Requis
  name?: string,           // Optionnel - seulement si on veut modifier le nom
  description?: string,     // Optionnel - seulement si on veut modifier la description
  action?: string,          // Optionnel - seulement si on veut modifier l'action
  order?: number,           // Optionnel - seulement si on veut modifier l'ordre
  meta?: object             // Optionnel - seulement si on veut modifier les métadonnées
}
```

**Note importante :** Les champs non fournis (`undefined`) ne sont pas envoyés au backend. Les valeurs existantes sont automatiquement préservées. Cela permet des mises à jour partielles sécurisées.

**Exemple : Mise à jour uniquement de la position**
```json
PATCH /observations/protocols/item/ea5919a4-dc92-4646-9183-c511b8bfda5a
{
  "protocolId": 1,
  "type": "category",
  "meta": {
    "position": { "x": 100, "y": 200 }
  }
}
```
Le nom, la description et les autres champs de la catégorie restent inchangés.

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

## Métadonnées (meta)

Le champ `meta` permet de stocker des données additionnelles pour chaque item. Il est couramment utilisé pour :

- **Position dans l'interface** : `{ position: { x: 100, y: 200 } }`
- **Préférences d'affichage** : `{ collapsed: true, color: '#ff0000' }`
- **Données personnalisées** : toute structure JSON valide

### Mise à jour des métadonnées

Lors de la mise à jour de `meta`, il est important de préserver les métadonnées existantes :

```typescript
// ❌ Mauvaise pratique : écrase toutes les métadonnées existantes
await protocolService.editProtocolItem({
  id: categoryId,
  protocolId: 1,
  type: ProtocolItemTypeEnum.Category,
  meta: {
    position: { x: 100, y: 200 }
  }
});

// ✅ Bonne pratique : préserve les métadonnées existantes
const category = await getCategory(categoryId);
await protocolService.editProtocolItem({
  id: categoryId,
  protocolId: 1,
  type: ProtocolItemTypeEnum.Category,
  meta: {
    ...(category.meta || {}),
    position: { x: 100, y: 200 }
  }
});
```

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

### Mises à jour partielles

- **Toujours utiliser des mises à jour partielles** : ne fournissez que les champs à modifier
- **Préserver les métadonnées existantes** : utilisez le spread operator pour `meta`
- **Ne pas envoyer de valeurs `undefined`** : le backend les ignore automatiquement, mais c'est une bonne pratique

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

### Perte de données lors de la mise à jour

Si des champs disparaissent après une mise à jour :

1. **Vérifiez que vous utilisez une mise à jour partielle** : ne fournissez que les champs à modifier
2. **Vérifiez que vous préservez les métadonnées** : utilisez `...(existingMeta || {})` lors de la mise à jour de `meta`
3. **Vérifiez les logs du backend** : les valeurs `undefined` ne devraient pas être envoyées
4. **Vérifiez que le backend a bien reçu les données** : le backend préserve automatiquement les champs non fournis

**Exemple de problème et solution :**

```typescript
// ❌ Problème : envoie seulement meta, mais le nom disparaît
await protocolService.editProtocolItem({
  id: categoryId,
  protocolId: 1,
  type: ProtocolItemTypeEnum.Category,
  meta: { position: { x: 100, y: 200 } }
});

// ✅ Solution : le backend préserve automatiquement le nom
// (correction appliquée dans le code)
// Le problème venait du fait que le controller envoyait tous les champs,
// y compris undefined, ce qui écrasait les valeurs existantes.
```

