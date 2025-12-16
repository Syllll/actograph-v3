# Mode d'affichage catégorie : Normal ou Arrière plan avec support

**Type** : Feature - Amélioration UX/UI  
**Statut** : ⏳ **En cours**  
**Auteur** : Sylvain Meylan

## Description

Permettre de choisir un mode d'affichage pour chaque catégorie dans le drawer de personnalisation du graphe :
- **Mode "normal"** : Affichage standard de la catégorie (comportement actuel)
- **Mode "arrière plan"** : La catégorie est affichée en arrière plan avec :
  - Un motif configurable (pour la catégorie entière ou pour chaque observable spécifiquement)
  - Un "support" qui peut être :
    - L'arrière plan du graph (fond général)
    - Une autre catégorie en mode d'affichage "normal"

Cette fonctionnalité permet de créer des visualisations en couches où certaines catégories servent de fond pour d'autres.

---

## Plan d'implémentation

### Phase 1 : Extension du modèle de données

#### 1.1 Extension de IGraphPreferences
**Fichiers à modifier** :
- `api/src/core/observations/entities/protocol.entity.ts`
- `front/src/services/observations/interface.ts`

**Tâches** :
- [x] Ajouter enum `DisplayModeEnum` avec valeurs `Normal` et `Background`
- [x] Étendre `IGraphPreferences` pour ajouter :
  - `displayMode?: DisplayModeEnum` : Mode d'affichage de la catégorie
  - `supportCategoryId?: string | null` : ID de la catégorie support (null = arrière plan du graph)
- [x] Les préférences de motif (`backgroundPattern`) existent déjà et s'appliquent uniquement en mode arrière plan

#### 1.2 Mise à jour des DTOs
**Fichiers à modifier** :
- `api/src/core/observations/dtos/protocol-item-graph-preferences.dto.ts`

**Tâches** :
- [x] Ajouter validation pour `displayMode` (enum)
- [x] Ajouter validation pour `supportCategoryId` (string optionnel ou null)

### Phase 2 : Interface utilisateur (Drawer)

#### 2.1 Ajout du sélecteur de mode d'affichage
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/Index.vue`

**Tâches** :
- [x] Ajouter un `q-select` pour choisir le mode d'affichage (Normal/Arrière plan) pour chaque catégorie
- [x] Afficher ce sélecteur avant les autres contrôles (couleur, épaisseur, motif)
- [x] Le sélecteur doit être visible uniquement pour les catégories (pas pour les observables)

#### 2.2 Ajout du sélecteur de support
**Tâches** :
- [x] Ajouter un `q-select` pour choisir le support (visible uniquement si mode = "arrière plan")
- [x] Options du sélecteur :
  - "Arrière plan du graph" (valeur: null)
  - Liste des autres catégories en mode "normal" (afficher leur nom)
- [x] Filtrer les catégories pour exclure :
  - La catégorie courante
  - Les catégories déjà en mode "arrière plan" (sauf si elles ont un support différent)

#### 2.3 Gestion de la visibilité des contrôles
**Tâches** :
- [x] Le sélecteur de motif doit être visible uniquement si mode = "arrière plan"
- [x] Le sélecteur de support doit être visible uniquement si mode = "arrière plan"
- [x] Les autres contrôles (couleur, épaisseur) restent visibles dans les deux modes

### Phase 3 : Rendu PixiJS

#### 3.1 Gestion de l'ordre de rendu
**Fichiers à modifier** :
- `front/src/pages/userspace/analyse/_components/graph/pixi-app/data-area/index.ts`

**Tâches** :
- [x] Modifier `drawCategory()` pour gérer l'ordre de rendu selon le mode :
  - Catégories en mode "normal" : rendu normal (comportement actuel)
  - Catégories en mode "arrière plan" : rendu en premier (sous les autres)
- [x] Organiser les catégories par ordre de rendu :
  1. D'abord toutes les catégories en mode "arrière plan" (triées par leur support)
  2. Ensuite toutes les catégories en mode "normal"

#### 3.2 Implémentation du support
**Tâches** :
- [x] Si `supportCategoryId` est null : dessiner le motif sur l'arrière plan du graph (toute la zone de données)
- [x] Si `supportCategoryId` est défini : dessiner le motif uniquement sur les segments de la catégorie support
- [x] Pour les segments horizontaux de la catégorie support, appliquer le motif de la catégorie en arrière plan
- [x] Le motif doit être dessiné AVANT les lignes de la catégorie support (sous les lignes)

#### 3.3 Gestion des motifs par observable
**Tâches** :
- [x] Si un observable a un motif spécifique (dans ses préférences), utiliser ce motif au lieu de celui de la catégorie
- [x] Le motif spécifique à l'observable s'applique uniquement aux segments de cet observable
- [x] Conserver la logique d'héritage existante pour les motifs

### Phase 4 : Backend

#### 4.1 Mise à jour du service
**Fichiers à modifier** :
- `api/src/core/observations/services/protocol/items.ts`

**Tâches** :
- [x] Vérifier que `updateItemGraphPreferences` accepte les nouveaux champs (`displayMode`, `supportCategoryId`)
- [x] Ajouter validation pour éviter les références circulaires :
  - Une catégorie ne peut pas avoir elle-même comme support (géré côté frontend dans `getSupportOptions`)
  - Une catégorie en mode "normal" ne peut pas être support d'une autre catégorie en mode "arrière plan" si elle-même a un support (géré côté frontend dans `getSupportOptions`)

---

## Problèmes rencontrés

_(À remplir pendant l'implémentation)_

---

## Initiatives prises

_(À remplir pendant l'implémentation)_

---

## Tests à effectuer

- [ ] Changer le mode d'affichage d'une catégorie de "normal" à "arrière plan" et vérifier le rendu
- [ ] Sélectionner "Arrière plan du graph" comme support et vérifier que le motif couvre toute la zone
- [ ] Sélectionner une autre catégorie comme support et vérifier que le motif s'applique uniquement sur ses segments
- [ ] Vérifier que les motifs spécifiques aux observables fonctionnent en mode arrière plan
- [ ] Vérifier que l'ordre de rendu est correct (arrière plan avant normal)
- [ ] Vérifier que les préférences sont sauvegardées et rechargées correctement
- [ ] Tester les cas limites :
  - Catégorie sans support (null)
  - Catégorie avec support vers une autre catégorie
  - Plusieurs catégories en arrière plan avec différents supports

