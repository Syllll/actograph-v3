# Feature #28 - Redesign de la page d'accueil

**Type** : UX/UI Design - Refactoring

## Description

Redesign complet de la page d'accueil pour une disposition plus simple et intuitive. L'objectif est de :

1. **Réorganiser la hiérarchie visuelle** : Mettre en avant la zone "Chronique active" qui prendra plus de place (2 cases verticalement)
2. **Intégrer les menus du drawer** : Intégrer Protocole, Observation, Graphe et Statistiques directement dans la zone "Chronique active"
3. **Fusionner les zones d'aide** : Fusionner "Centre d'aide" et "En savoir plus" en une seule zone "Aide & Informations"
4. **Simplifier le drawer** : Adapter le drawer pour éviter la redondance sur la page d'accueil

## État actuel du projet

### Ce qui existe déjà

✅ **Page d'accueil actuelle** (`front/src/pages/userspace/home/Index.vue`)
- Structure avec 4 blocs en grille 2x2 (col-6 x col-6)
- Bloc "Vos chroniques" avec composant `MyObservations` (liste paginée)
- Bloc "Centre d'aide" avec composant `FirstSteps` (démarrage rapide + documentation)
- Bloc "Chronique active" avec composant `ActiveChronicle` (informations + actions)
- Bloc "En savoir plus" avec composant `Advertisement` (version, licence, à propos)

✅ **Composant ActiveChronicle** (`front/src/pages/userspace/home/_components/active-chronicle/Index.vue`)
- Affiche les informations de la chronique (nom, description, métriques)
- Boutons d'action : "Constituer mon Protocole", "Faire mon observation", "Voir mon graph d'activité"
- Bouton secondaire : "Charger une autre chronique"
- Gestion de l'état vide (aucune chronique chargée)

✅ **Drawer de navigation** (`front/src/pages/userspace/_components/drawer/Index.vue`)
- Menu de navigation : Accueil, Protocole, Observation, Graphe, Statistiques
- Boutons d'action : Nouvelle chronique, Importer, Exporter
- Carte chronique active en bas du drawer
- Gestion des états désactivés avec tooltips

✅ **Menu du drawer** (`front/src/pages/userspace/_components/drawer/menu.ts`)
- Configuration des items de menu avec icônes, labels, actions
- Gestion des états disabled selon la chronique chargée
- Tooltips explicatifs pour les items désactivés

### Ce qui manque

❌ **Nouvelle disposition asymétrique** : Layout avec colonne gauche (1/3) et colonne droite (2/3)
❌ **Intégration des actions principales** : Protocole, Observation, Graphe, Stats dans la zone chronique active
❌ **Composant HelpAndInfo** : Fusion de FirstSteps et Advertisement
❌ **Adaptation du drawer** : Simplification sur la page d'accueil pour éviter la redondance
❌ **Réorganisation du composant ActiveChronicle** : Structure en 3 sections distinctes

## Plan d'implémentation

### Phase 1 : Restructuration de la page d'accueil

#### 1.1 Modification du layout principal
**Fichiers à modifier** :
- `front/src/pages/userspace/home/Index.vue`

**Tâches** :
- [ ] Changer la structure de grille 2x2 vers layout asymétrique
- [ ] Colonne gauche : "Vos chroniques" (col-4)
- [ ] Colonne droite : "Chronique active" (col-8)
- [ ] Zone "Aide & Informations" en pleine largeur (col-12) sous les deux colonnes
- [ ] Ajuster les espacements avec `q-gutter-md`

#### 1.2 Création du composant HelpAndInfo
**Fichiers à créer** :
- `front/src/pages/userspace/home/_components/help-and-info/Index.vue`

**Tâches** :
- [ ] Créer le composant qui fusionne FirstSteps et Advertisement
- [ ] Layout horizontal en 3 colonnes :
  - Colonne 1 : Démarrage rapide (bouton "Charger l'exemple")
  - Colonne 2 : Documentation (liens essentiels : Didacticiel, Documentation, FAQ)
  - Colonne 3 : Informations (Version, Licence, Contact)
- [ ] Réutiliser le code existant de FirstSteps et Advertisement
- [ ] Appliquer les styles cohérents avec les autres composants

**Fichiers à modifier** :
- `front/src/pages/userspace/home/Index.vue` : Remplacer FirstSteps et Advertisement par HelpAndInfo

### Phase 2 : Réorganisation du composant ActiveChronicle

#### 2.1 Restructuration en 3 sections
**Fichiers à modifier** :
- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`

**Tâches** :
- [ ] Section 1 : Informations de la chronique (garder l'existant)
  - Nom et description
  - Métriques (dates, relevés, catégories, observables)
- [ ] Section 2 : Actions principales (NOUVEAU)
  - Créer une grille 2x2 avec les 4 actions principales :
    - Protocole (icône `mdi-flask-outline`)
    - Observation (icône `mdi-binoculars`)
    - Graphe (icône `mdi-chart-line`)
    - Statistiques (icône `mdi-chart-box`)
  - Gérer les états disabled (Graphe et Stats si pas de relevés)
  - Ajouter les tooltips explicatifs
  - Utiliser les mêmes méthodes de navigation que le drawer
- [ ] Section 3 : Actions secondaires (réorganiser l'existant)
  - "Charger une autre chronique"
  - "Nouvelle chronique" (si aucune chronique chargée)
  - "Importer" / "Exporter" (si aucune chronique chargée)

#### 2.2 Styles et espacement
**Fichiers à modifier** :
- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue` (section `<style>`)

**Tâches** :
- [ ] Ajuster les espacements entre les 3 sections
- [ ] Styliser la grille d'actions principales (2x2)
- [ ] Assurer une hauteur suffisante pour la zone chronique active
- [ ] Utiliser les classes Quasar pour le layout (`row`, `col`, `q-gutter-md`)

### Phase 3 : Adaptation du drawer

#### 3.1 Détection de la page d'accueil
**Fichiers à modifier** :
- `front/src/pages/userspace/_components/drawer/Index.vue`

**Tâches** :
- [ ] Ajouter une computed property `isHomePage` qui vérifie la route actuelle
- [ ] Utiliser `useRoute()` pour détecter si on est sur `user_home`

#### 3.2 Simplification de la carte chronique sur la page d'accueil
**Fichiers à modifier** :
- `front/src/pages/userspace/_components/drawer/Index.vue`

**Tâches** :
- [ ] Conditionner l'affichage de la carte chronique : `v-if="!isHomePage"`
- [ ] Sur la page d'accueil, afficher un indicateur minimal à la place :
  - Icône d'information
  - Message : "Utilisez la zone 'Chronique active' pour les actions"
- [ ] Garder la carte complète sur les autres pages

### Phase 4 : Nettoyage et optimisation

#### 4.1 Suppression des composants obsolètes (optionnel)
**Fichiers à supprimer** (si plus utilisés) :
- `front/src/pages/userspace/home/_components/first-steps/Index.vue` (intégré dans HelpAndInfo)
- `front/src/pages/userspace/home/_components/advertisement/Index.vue` (intégré dans HelpAndInfo)

**Note** : Ne supprimer que si le code est complètement intégré dans HelpAndInfo

#### 4.2 Vérification de la cohérence
**Tâches** :
- [ ] Vérifier que toutes les fonctionnalités existantes sont préservées
- [ ] Tester la navigation depuis la zone chronique active
- [ ] Vérifier les états disabled des boutons
- [ ] Tester sur différentes tailles d'écran
- [ ] Vérifier le comportement du drawer sur toutes les pages

## Structure des fichiers à créer/modifier

### Nouveaux fichiers
```
front/src/pages/userspace/home/_components/help-and-info/
└── Index.vue                    # Composant fusionnant FirstSteps et Advertisement
```

### Fichiers à modifier
```
front/src/pages/userspace/home/
└── Index.vue                    # Layout principal (grille asymétrique)

front/src/pages/userspace/home/_components/
└── active-chronicle/
    └── Index.vue                # Réorganisation en 3 sections + actions principales

front/src/pages/userspace/_components/drawer/
└── Index.vue                    # Adaptation pour la page d'accueil
```

### Fichiers potentiellement obsolètes (à supprimer après vérification)
```
front/src/pages/userspace/home/_components/
├── first-steps/
│   └── Index.vue                # Code intégré dans HelpAndInfo
└── advertisement/
    └── Index.vue                # Code intégré dans HelpAndInfo
```

## Priorités

### Priorité haute (MVP)
1. **Phase 1** : Restructuration de la page d'accueil
   - Layout asymétrique fonctionnel
   - Composant HelpAndInfo créé et intégré

2. **Phase 2** : Réorganisation du composant ActiveChronicle
   - Section actions principales avec les 4 boutons
   - Navigation fonctionnelle vers Protocole, Observation, Graphe, Stats

### Priorité moyenne
3. **Phase 3** : Adaptation du drawer
   - Simplification sur la page d'accueil
   - Carte chronique masquée/adaptée

### Priorité basse (bonus)
4. **Phase 4** : Nettoyage
   - Suppression des composants obsolètes
   - Optimisations supplémentaires

## Notes techniques

### Conventions à respecter

- **Layout** : Utiliser les classes Quasar (`row`, `col`, `col-4`, `col-8`, `col-12`)
- **Espacement** : Utiliser `q-gutter-md` pour les espacements cohérents
- **Composants** : Respecter la structure avec `defineComponent` et `setup()`
- **Navigation** : Utiliser `useRouter()` et `router.push({ name: 'route_name' })`
- **États disabled** : Réutiliser la logique existante du drawer pour Graphe et Stats
- **Tooltips** : Utiliser `q-tooltip` pour les explications

### Réutilisation du code existant

- **Méthodes de navigation** : Réutiliser les méthodes existantes dans ActiveChronicle (`navigateToProtocol`, `navigateToObservation`, `navigateToGraph`)
- **Logique disabled** : Réutiliser la logique du drawer (`hasObservables`, `hasReadings`)
- **Composables** : Réutiliser `useObservation()`, `useRouter()`, `useRoute()`
- **Services** : Réutiliser les services existants pour l'import/export

### Points d'attention

- ⚠️ **Hauteur de la zone chronique active** : S'assurer qu'elle prend bien 2 cases verticalement (utiliser `min-height` si nécessaire)
- ⚠️ **Responsive** : Vérifier le comportement sur petits écrans (le drawer peut masquer le contenu)
- ⚠️ **États disabled** : Maintenir la cohérence avec le drawer (même logique, mêmes tooltips)
- ⚠️ **Navigation** : S'assurer que les boutons de la zone chronique active utilisent les mêmes routes que le drawer

## Tests à effectuer

### Tests fonctionnels
- [ ] Navigation depuis les boutons de la zone chronique active
- [ ] États disabled des boutons Graphe et Statistiques
- [ ] Tooltips affichés correctement
- [ ] Carte chronique dans le drawer masquée sur la page d'accueil
- [ ] Carte chronique dans le drawer visible sur les autres pages
- [ ] Composant HelpAndInfo affiche correctement toutes les sections

### Tests visuels
- [ ] Layout asymétrique respecté (1/3 - 2/3)
- [ ] Zone chronique active prend bien 2 cases verticalement
- [ ] Espacements cohérents entre les sections
- [ ] Grille d'actions principales bien alignée (2x2)
- [ ] Zone Aide & Informations en pleine largeur

### Tests d'intégration
- [ ] Toutes les fonctionnalités existantes fonctionnent toujours
- [ ] Import/Export fonctionnent depuis les deux emplacements (drawer et zone chronique active)
- [ ] Création de chronique fonctionne depuis les deux emplacements
- [ ] Chargement d'exemple fonctionne depuis HelpAndInfo

## Références

- Page d'accueil actuelle : `front/src/pages/userspace/home/Index.vue`
- Composant ActiveChronicle : `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`
- Drawer : `front/src/pages/userspace/_components/drawer/Index.vue`
- Menu du drawer : `front/src/pages/userspace/_components/drawer/menu.ts`
- Documentation du processus : `docs/auto-implement.md`

