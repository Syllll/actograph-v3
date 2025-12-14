# Personnalisation du graphe d'activité

**Type** : Feature - Amélioration UX/UI  
**Statut** : ⏳ **En cours**  
**Auteur** : Sylvain Meylan

## Description

Intégration des fonctionnalités de personnalisation du graphe d'activité depuis la version 1 (obsolète). L'objectif est de permettre à l'utilisateur de personnaliser l'affichage du graphe d'activité avec :

1. **Changement des couleurs** : Personnaliser la couleur de chaque observable (ou catégorie pour héritage)
2. **Taille des traits** : Ajuster l'épaisseur des lignes pour chaque observable (ou catégorie pour héritage)
3. **Motifs d'arrière-plan** : Afficher certains observables en arrière-plan avec différents motifs (lignes horizontales, verticales, diagonales, etc.)

**Logique d'héritage** : Les préférences d'une catégorie s'appliquent à tous ses observables, sauf si un observable a des préférences spécifiques.

Ces fonctionnalités doivent être présentes dans un **side drawer** qui s'affiche à droite du graphe dans l'onglet concerné. Un changement doit se répercuter dynamiquement dans le graphe.

**Référence v1** : `/home/syl/workdir/improba/symalgo/actograph-v1/actograph/Gui/Graph/Options/GraphOptions.qml`

---

## État actuel du projet

### Ce qui existe déjà

✅ **Composant graphique avec PixiJS** (`front/src/pages/userspace/analyse/_components/graph/`)
- Structure complète avec `Index.vue`, `use-graph.ts`, et classes PixiJS
- Affichage des catégories avec couleurs hardcodées :
  - Vert (`'green'`) pour les segments horizontaux (maintien sur l'observable)
  - Gris (`'grey'`) pour les segments verticaux (transitions)
  - Vert (`'green'`) pour les points des catégories discrètes
- Structure de données `readingsPerCategory` et `graphicPerCategory`
- Méthode `drawCategory()` qui dessine les catégories dans `DataArea`

✅ **Entité ActivityGraph** (`api/src/core/observations/entities/activity-graph.entity.ts`)
- Entité simple avec `name`, `description`, et relation `observation`
- Pas encore de stockage des préférences de personnalisation

✅ **Composants Quasar disponibles**
- `q-drawer` : Composant drawer de Quasar (déjà utilisé dans le projet)
- `q-color` : Composant color picker de Quasar (non encore utilisé)
- `q-slider` : Composant slider pour l'épaisseur des traits
- `q-select` : Composant select pour les motifs d'arrière-plan

✅ **Structure de données ProtocolItem**
- Les catégories et observables sont déjà parsées depuis le protocole
- Chaque item (catégorie ou observable) a un `id` unique
- Les items sont stockés en JSON dans le champ `items` du protocole
- Interface `ProtocolItem` existe avec champ `meta` (peut être utilisé pour les préférences)

### Ce qui manque

❌ **Stockage des préférences** : Pas de champ `graphPreferences` dans `ProtocolItem` pour stocker les préférences
❌ **Logique d'héritage** : Pas de fonction pour récupérer les préférences d'un observable avec héritage depuis sa catégorie parente
❌ **Drawer de personnalisation** : Pas de drawer latéral à droite du graphe
❌ **Composants de personnalisation** : Pas de color picker, slider, ou sélecteur de motifs
❌ **Intégration PixiJS** : Le code utilise des couleurs hardcodées au lieu de préférences
❌ **Mise à jour dynamique** : Pas de système pour redessiner le graphe lors des changements
❌ **API backend** : Pas d'endpoints pour sauvegarder/charger les préférences
❌ **Motifs d'arrière-plan** : Pas d'implémentation des motifs dans PixiJS

---

## Plan d'implémentation

### Phase 1 : Modèle de données et backend

#### 1.1 Extension de l'interface ProtocolItem
**Fichiers à modifier** :
- `api/src/core/observations/entities/protocol.entity.ts`

**Tâches** :
- [ ] Ajouter champ `graphPreferences?: IGraphPreferences` dans l'interface `ProtocolItem`
- [ ] Créer interface `IGraphPreferences` :
  ```typescript
  export interface IGraphPreferences {
    color?: string;
    strokeWidth?: number;
    backgroundPattern?: BackgroundPatternEnum;
  }
  ```
- [ ] Créer enum `BackgroundPatternEnum` avec les valeurs de la v1 :
  - `solid`, `dense1` à `dense7`, `horizontal`, `vertical`, `cross`, `backwardDiagonal`, `forwardDiagonal`, `diagonalCross`
- [ ] Les préférences sont optionnelles : si un item n'a pas de préférences, utiliser les valeurs par défaut ou hériter de la catégorie parente

#### 1.2 Création des DTOs
**Fichiers à créer** :
- `api/src/core/observations/dtos/protocol-item-graph-preferences.dto.ts`

**Tâches** :
- [ ] Créer `UpdateProtocolItemGraphPreferencesDto` avec validation
- [ ] Structure : `{ itemId: string, color?: string, strokeWidth?: number, backgroundPattern?: string }`
- [ ] Validation avec `class-validator` : `@IsString()`, `@IsOptional()`, `@IsNumber()`, `@IsEnum()`

#### 1.3 Extension du service Protocol
**Fichiers à modifier** :
- `api/src/core/observations/services/protocol/items.ts`

**Tâches** :
- [ ] Ajouter méthode `updateItemGraphPreferences(protocolId: number, itemId: string, preferences: UpdateProtocolItemGraphPreferencesDto)`
- [ ] La méthode doit :
  - Charger le protocole existant
  - Parser le JSON des items
  - Trouver l'item par son `id` (catégorie ou observable)
  - Mettre à jour ou créer le champ `graphPreferences` de l'item
  - Sauvegarder le protocole avec le JSON mis à jour
- [ ] Ajouter méthode `getItemGraphPreferences(protocolId: number, itemId: string)` pour récupérer les préférences d'un item
- [ ] Ajouter méthode `getObservableGraphPreferencesWithInheritance(protocolId: number, observableId: string)` :
  - Récupère les préférences de l'observable
  - Si l'observable n'a pas de préférences, trouve sa catégorie parente et récupère ses préférences
  - Retourne les préférences avec héritage appliqué

#### 1.4 Extension du controller Protocol
**Fichiers à modifier** :
- `api/src/core/observations/controllers/protocol.controller.ts`

**Tâches** :
- [ ] Ajouter route `PATCH /observations/protocols/:protocolId/item/:itemId/graph-preferences`
  - Utiliser `@UseGuards(JwtAuthGuard, UserRolesGuard)`
  - Utiliser `@Roles(UserRoleEnum.User)`
  - Valider le DTO avec `@Body()`
- [ ] Ajouter route `GET /observations/protocols/:protocolId/item/:itemId/graph-preferences`
  - Utiliser `@UseGuards(JwtAuthGuard)`
  - Retourner les préférences de l'item (sans héritage)
- [ ] Ajouter route `GET /observations/protocols/:protocolId/observable/:observableId/graph-preferences-with-inheritance`
  - Utiliser `@UseGuards(JwtAuthGuard)`
  - Retourner les préférences de l'observable avec héritage depuis sa catégorie parente

#### 1.5 Pas de migration nécessaire
**Note** : Les préférences sont stockées dans le JSON existant du champ `items` du protocole, donc aucune migration n'est nécessaire.

### Phase 2 : Interface frontend - Service et interfaces

#### 2.1 Extension de l'interface IProtocolItem
**Fichiers à modifier** :
- `front/src/services/observations/interface.ts`

**Tâches** :
- [ ] Ajouter champ `graphPreferences?: IGraphPreferences` dans `IProtocolItem`
- [ ] Créer interface `IGraphPreferences` :
  ```typescript
  export interface IGraphPreferences {
    color?: string;
    strokeWidth?: number;
    backgroundPattern?: BackgroundPatternEnum;
  }
  ```
- [ ] Créer enum `BackgroundPatternEnum` avec les valeurs de la v1 :
  - `solid`, `dense1` à `dense7`, `horizontal`, `vertical`, `cross`, `backwardDiagonal`, `forwardDiagonal`, `diagonalCross`

#### 2.2 Extension du service Protocol frontend
**Fichiers à modifier** :
- `front/src/services/observations/protocol.service.ts`

**Tâches** :
- [ ] Ajouter méthode `updateItemGraphPreferences(protocolId: number, itemId: string, preferences: Partial<IGraphPreferences>)`
- [ ] Ajouter méthode `getItemGraphPreferences(protocolId: number, itemId: string): Promise<IGraphPreferences | null>`
- [ ] Ajouter méthode `getObservableGraphPreferencesWithInheritance(protocolId: number, observableId: string): Promise<IGraphPreferences>` :
  - Appelle l'API backend pour récupérer les préférences avec héritage
  - Retourne les préférences de l'observable ou de sa catégorie parente

#### 2.3 Fonction utilitaire d'héritage côté frontend
**Fichiers à créer** :
- `front/src/services/observations/protocol-graph-preferences.utils.ts`

**Tâches** :
- [ ] Créer fonction `getObservableGraphPreferences(observableId: string, protocol: IProtocol): IGraphPreferences | null`
- [ ] La fonction doit :
  - Trouver l'observable dans le protocole parsé
  - Si l'observable a des `graphPreferences`, les retourner
  - Sinon, trouver la catégorie parente qui contient cet observable
  - Retourner les `graphPreferences` de la catégorie parente (ou null si aucune préférence)
- [ ] Cette fonction permet de récupérer les préférences sans appel API supplémentaire

### Phase 3 : Composant drawer de personnalisation

#### 3.1 Création du drawer de personnalisation
**Fichiers à créer** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/Index.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/use-graph-customization.ts`

**Tâches** :
- [ ] Créer le composant drawer avec `q-drawer` positionné à droite (`side="right"`)
- [ ] Largeur du drawer : `350px` (ajustable)
- [ ] Le drawer doit être visible uniquement sur la page du graphe
- [ ] Créer un composable pour gérer l'état du drawer (ouvert/fermé)
- [ ] Ajouter un bouton toggle pour ouvrir/fermer le drawer dans le composant graph principal

#### 3.2 Liste des catégories dans le drawer
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/Index.vue`

**Tâches** :
- [ ] Afficher la liste des catégories du protocole
- [ ] Pour chaque catégorie, afficher :
  - Nom de la catégorie
  - Color picker (prévisualisation + sélecteur)
  - Slider pour l'épaisseur des traits (1-10px)
  - Sélecteur de motif d'arrière-plan (si applicable)
- [ ] Utiliser `q-list` et `q-item` pour la structure
- [ ] Utiliser `q-expansion-item` pour permettre de replier/déplier chaque catégorie

#### 3.3 Composant Color Picker
**Fichiers à créer** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/ItemColorPicker.vue`

**Tâches** :
- [ ] Créer un composant qui affiche un carré de couleur (prévisualisation)
- [ ] Props : `itemId`, `itemType` ('category' ou 'observable'), `currentColor` (peut être héritée)
- [ ] Afficher un indicateur si la couleur est héritée (icône ou style différent)
- [ ] Au clic, ouvrir un `q-color` (dialog ou popup)
- [ ] Le color picker doit permettre de choisir une couleur hexadécimale
- [ ] Appliquer la couleur immédiatement au graphe (mise à jour dynamique)
- [ ] Sauvegarder les préférences via `protocolService.updateItemGraphPreferences()`

#### 3.4 Composant Stroke Width Slider
**Fichiers à créer** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/ItemStrokeWidth.vue`

**Tâches** :
- [ ] Créer un composant avec `q-slider` pour l'épaisseur des traits
- [ ] Props : `itemId`, `itemType`, `currentStrokeWidth` (peut être héritée)
- [ ] Valeurs : 1 à 10 pixels
- [ ] Afficher la valeur actuelle à côté du slider
- [ ] Afficher un indicateur si la valeur est héritée
- [ ] Appliquer l'épaisseur immédiatement au graphe
- [ ] Sauvegarder les préférences via `protocolService.updateItemGraphPreferences()`

#### 3.5 Composant Background Pattern Selector
**Fichiers à créer** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/ItemBackgroundPattern.vue`

**Tâches** :
- [ ] Créer un composant avec `q-select` pour choisir le motif
- [ ] Props : `itemId`, `itemType`, `currentPattern` (peut être héritée)
- [ ] Options : Tous les motifs de `BackgroundPatternEnum`
- [ ] Afficher une prévisualisation du motif (petit carré avec le motif)
- [ ] Option "Aucun motif" (solid) par défaut
- [ ] Afficher un indicateur si le motif est héritée
- [ ] Appliquer le motif immédiatement au graphe
- [ ] Sauvegarder les préférences via `protocolService.updateItemGraphPreferences()`

### Phase 4 : Intégration avec PixiJS

#### 4.1 Système de préférences dans PixiApp
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/pixi-app/index.ts`

**Tâches** :
- [ ] Ajouter une propriété `preferences: Record<string, IGraphCategoryPreferences>` dans `PixiApp`
- [ ] Ajouter méthode `setPreferences(preferences: Record<string, IGraphCategoryPreferences>)`
- [ ] Ajouter méthode `updateCategoryPreference(categoryId: string, preference: Partial<IGraphCategoryPreferences>)`
- [ ] La méthode `updateCategoryPreference` doit :
  - Mettre à jour les préférences internes
  - Appeler `this.dataArea.redrawCategory(categoryId)` pour redessiner uniquement cette catégorie

#### 4.2 Modification de DataArea pour utiliser les préférences
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/pixi-app/data-area/index.ts`

**Tâches** :
- [ ] Ajouter une propriété `preferences: Record<string, IGraphCategoryPreferences>` dans `DataArea`
- [ ] Ajouter méthode `setPreferences(preferences: Record<string, IGraphCategoryPreferences>)`
- [ ] Modifier `drawCategory()` pour utiliser les préférences au lieu des couleurs hardcodées :
  - Récupérer les préférences de la catégorie : `const prefs = this.preferences[category.id]`
  - Utiliser `prefs?.color ?? 'green'` pour la couleur par défaut
  - Utiliser `prefs?.strokeWidth ?? 2` pour l'épaisseur par défaut
- [ ] Ajouter méthode `redrawCategory(categoryId: string)` pour redessiner uniquement une catégorie
- [ ] Implémenter les motifs d'arrière-plan avec PixiJS :
  - Créer des textures pour chaque motif (lignes horizontales, verticales, diagonales, etc.)
  - Utiliser `Graphics.beginTextureFill()` pour remplir avec une texture
  - Les motifs doivent être appliqués aux segments horizontaux des catégories continues

#### 4.3 Création des textures de motifs dans PixiJS
**Fichiers à créer** :
- `front/src/pages/userspace/analyse/_components/graph/pixi-app/lib/pattern-textures.ts`

**Tâches** :
- [ ] Créer une fonction `createPatternTexture(app: Application, pattern: BackgroundPatternEnum, color: string): Texture`
- [ ] Implémenter chaque motif :
  - `solid` : Texture unie (pas de motif)
  - `dense1` à `dense7` : Densités variables de points
  - `horizontal` : Lignes horizontales
  - `vertical` : Lignes verticales
  - `cross` : Lignes croisées
  - `backwardDiagonal` : Lignes diagonales arrière (\)
  - `forwardDiagonal` : Lignes diagonales avant (/)
  - `diagonalCross` : Lignes diagonales croisées
- [ ] Utiliser `Graphics` de PixiJS pour dessiner les motifs sur un canvas temporaire
- [ ] Convertir le canvas en `Texture` avec `Texture.from()`

#### 4.4 Connexion entre le drawer et PixiApp
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/use-graph.ts`

**Tâches** :
- [ ] Passer le protocole à `pixiApp.setProtocol()` lors du chargement
- [ ] Exposer les méthodes de PixiApp pour mettre à jour les préférences
- [ ] Créer un système d'événements ou de réactivité pour notifier les changements
- [ ] Le drawer doit pouvoir appeler `pixiApp.updateObservablePreference()` directement

**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/Index.vue`

**Tâches** :
- [ ] Ajouter le drawer de personnalisation à côté du graphe
- [ ] Passer la référence à `pixiApp` au drawer
- [ ] Ajouter un bouton toggle pour ouvrir/fermer le drawer (icône `mdi-palette` ou `mdi-tune`)

### Phase 5 : Sauvegarde et chargement des préférences

#### 5.1 Chargement des préférences au démarrage
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/use-graph.ts`

**Tâches** :
- [ ] Lors du chargement de l'observation, récupérer le protocole associé
- [ ] Passer le protocole à `pixiApp.setProtocol()` pour que PixiApp puisse accéder aux préférences
- [ ] Les préférences sont déjà dans le protocole (dans le JSON des items), pas besoin de charger séparément
- [ ] Si pas de préférences, utiliser les valeurs par défaut lors du dessin

#### 5.2 Sauvegarde automatique des préférences
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/use-graph-customization.ts`

**Tâches** :
- [ ] Lors de la modification d'une préférence dans le drawer :
  - Appeler `protocolService.updateItemGraphPreferences()` pour sauvegarder dans le protocole
  - Mettre à jour le protocole localement pour refléter le changement
  - Appeler `pixiApp.updateObservablePreference()` pour redessiner le graphe
- [ ] Débouncer les appels de sauvegarde (attendre 500ms après le dernier changement)
- [ ] Afficher une notification de succès/erreur lors de la sauvegarde

#### 5.3 Gestion des erreurs
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/use-graph-customization.ts`

**Tâches** :
- [ ] Gérer les erreurs de sauvegarde avec des notifications appropriées
- [ ] Permettre de continuer à utiliser les préférences même si la sauvegarde échoue
- [ ] Gérer les cas où le protocole n'est pas encore chargé

---

## Structure des fichiers à créer/modifier

### Nouveaux fichiers

```
api/src/core/observations/dtos/protocol-item-graph-preferences.dto.ts

front/src/services/observations/protocol-graph-preferences.utils.ts

front/src/pages/userspace/analyse/_components/graph-customization-drawer/
├── Index.vue
├── use-graph-customization.ts
├── ItemColorPicker.vue
├── ItemStrokeWidth.vue
└── ItemBackgroundPattern.vue

front/src/pages/userspace/analyse/_components/graph/pixi-app/lib/
└── pattern-textures.ts
```

### Fichiers à modifier

```
api/src/core/observations/entities/protocol.entity.ts
api/src/core/observations/services/protocol/items.ts
api/src/core/observations/controllers/protocol.controller.ts

front/src/services/observations/interface.ts
front/src/services/observations/protocol.service.ts

front/src/pages/userspace/analyse/_components/graph/
├── Index.vue
├── use-graph.ts
└── pixi-app/
    ├── index.ts
    └── data-area/index.ts
```

---

## Priorités

### Priorité haute (MVP)
1. **Phase 1** : Modèle de données et backend (stockage des préférences)
2. **Phase 2** : Service et interfaces frontend
3. **Phase 3.1-3.2** : Drawer de base avec liste des catégories
4. **Phase 3.3** : Color picker fonctionnel
5. **Phase 4.1-4.2** : Intégration PixiJS avec couleurs personnalisées
6. **Phase 5** : Sauvegarde et chargement des préférences

### Priorité moyenne
7. **Phase 3.4** : Slider pour l'épaisseur des traits
8. **Phase 4.2** : Application de l'épaisseur dans PixiJS

### Priorité basse (bonus)
9. **Phase 3.5** : Sélecteur de motifs d'arrière-plan
10. **Phase 4.3** : Implémentation des textures de motifs dans PixiJS
11. **Phase 4.2** : Application des motifs d'arrière-plan

---

## Notes techniques

### Stockage des préférences
- Les préférences sont stockées en JSON dans le champ `preferences` de `ActivityGraph`
- Structure : `{ [categoryId: string]: { color?: string, strokeWidth?: number, backgroundPattern?: string } }`
- Les préférences sont optionnelles : si une catégorie n'a pas de préférences, utiliser les valeurs par défaut

### Valeurs par défaut
- **Couleur** : `'green'` pour les segments horizontaux, `'grey'` pour les segments verticaux
- **Épaisseur** : `2px` pour les segments horizontaux, `1px` pour les segments verticaux
- **Motif** : `'solid'` (pas de motif) par défaut

### Motifs d'arrière-plan
- Les motifs sont inspirés de Qt (v1) : `SolidPattern`, `Dense1Pattern` à `Dense7Pattern`, `HorPattern`, `VerPattern`, `CrossPattern`, `BDiagPattern`, `FDiagPattern`, `DiagCrossPattern`
- Dans PixiJS, les motifs seront implémentés avec des textures créées dynamiquement
- Les motifs s'appliquent uniquement aux segments horizontaux (maintien sur l'observable)

### Mise à jour dynamique
- Les changements dans le drawer doivent se répercuter immédiatement dans le graphe
- Utiliser `redrawObservable()` pour redessiner uniquement les readings de l'observable modifié (performance)
- Si une préférence de catégorie change, redessiner tous les observables de cette catégorie qui n'ont pas de préférences spécifiques
- Ne pas redessiner tout le graphe à chaque changement

### Performance
- Débouncer les sauvegardes pour éviter trop d'appels API
- Utiliser des textures en cache pour les motifs (ne pas recréer à chaque fois)
- Redessiner uniquement les observables modifiés, pas tout le graphe
- La fonction d'héritage doit être efficace : parcourir l'arbre des items une seule fois

### Avantages de cette approche
- ✅ **Réutilisable** : Les préférences sont liées au protocole, pas à l'ActivityGraph
- ✅ **Héritage naturel** : Les observables héritent automatiquement des préférences de leur catégorie
- ✅ **Pas de migration** : Utilise le JSON existant du protocole
- ✅ **Plus logique** : Les préférences d'affichage sont une propriété du protocole, pas du graphe

---

## Problèmes rencontrés

_(À remplir pendant l'implémentation)_

---

## Initiatives prises

_(À remplir pendant l'implémentation)_
