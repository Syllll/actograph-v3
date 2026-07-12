# Feature #22, #23 - Statistiques

**Issues GitHub** : [#22](https://github.com/Syllll/actograph-v3/issues/22), [#23](https://github.com/Syllll/actograph-v3/issues/23)  
**Priorité** : P1-Must Have  
**Statut** : ✅ **Implémenté**

## Description

Implémentation complète du système de statistiques pour les observations, permettant aux utilisateurs d'analyser leurs données sous différentes formes :
- Vue globale avec tableau des statistiques générales
- Vue par catégorie avec diagrammes (camembert et histogramme)
- Mode avancé avec conditions logiques (ET/OU)

---

## Plan d'implémentation

### Phase 1 : Vue globale des statistiques

#### 1.1 Backend - Endpoint général
**Fichiers à créer** :
- `api/src/core/observations/services/statistics.service.ts`
- `api/src/core/observations/controllers/statistics.controller.ts`
- `api/src/core/observations/dtos/statistics-general.dto.ts`

**Tâches** :
- [x] Créer le service `StatisticsService` avec méthode `getGeneralStatistics()`
- [x] Créer le controller avec route `GET /observations/:id/statistics/general`
- [x] Calculer les statistiques générales :
  - Durée totale d'observation (START à STOP)
  - Durée d'observation effective (moins les pauses)
  - Nombre total de readings
  - Nombre de pauses
  - Durée totale des pauses
- [x] Calculer les statistiques par catégorie :
  - Nombre d'observables actifs par catégorie
  - Durée totale d'état "on" pour tous les observables de la catégorie

#### 1.2 Frontend - Vue globale
**Fichiers à créer** :
- `front/src/services/observations/statistics.service.ts`
- `front/src/services/observations/statistics.interface.ts`
- `front/src/composables/use-statistics/index.ts`
- `front/src/pages/userspace/statistics/_components/GeneralStatisticsView.vue`

**Tâches** :
- [x] Créer le service frontend pour les appels API
- [x] Créer le composable pour gérer l'état des statistiques
- [x] Créer le composant de vue globale avec tableaux des statistiques
- [x] Afficher les statistiques générales et par catégorie

### Phase 2 : Vue par catégorie avec diagrammes

#### 2.1 Backend - Endpoint par catégorie
**Fichiers à créer** :
- `api/src/core/observations/dtos/statistics-category.dto.ts`

**Tâches** :
- [x] Créer la route `GET /observations/:id/statistics/category/:categoryId`
- [x] Calculer les statistiques pour une catégorie :
  - Pour chaque observable : durée d'état "on" et pourcentage
  - Gestion des catégories continues vs discrètes (one-shot)
  - Exclusion automatique des pauses

#### 2.2 Frontend - Composants graphiques
**Fichiers à créer** :
- `front/src/pages/userspace/statistics/_components/CategoryStatisticsView.vue`
- `front/src/pages/userspace/statistics/_components/AmChartsPieChart.vue`
- `front/src/pages/userspace/statistics/_components/AmChartsBarChart.vue`

**Tâches** :
- [x] Créer le composant de vue par catégorie avec sélecteur
- [x] Créer le composant camembert (PieChart) avec AmCharts 5
- [x] Créer le composant histogramme (BarChart) avec AmCharts 5
- [x] Afficher les pourcentages et durées formatées
- [x] Ajouter l'option pour traiter les pauses comme un état séparé (toggle unique, camembert)

### Phase 3 : Mode avancé avec conditions

#### 3.1 Backend - Endpoint conditionnel
**Fichiers à créer** :
- `api/src/core/observations/dtos/statistics-conditional.dto.ts`

**Tâches** :
- [x] Créer la route `POST /observations/:id/statistics/conditional`
- [x] Implémenter la logique de conditions :
  - Opérateurs ET/OU entre observables dans un groupe
  - Opérateurs ET/OU entre groupes de conditions
  - Filtrage temporel optionnel par groupe
  - Calcul des périodes d'intersection/union

#### 3.2 Frontend - Vue conditionnelle
**Fichiers à créer** :
- `front/src/pages/userspace/statistics/_components/ConditionalStatisticsView.vue`

**Tâches** :
- [x] Créer l'interface pour construire des conditions multiples
- [x] Permettre la sélection d'observables avec état ("on" ou "off")
- [x] Permettre la sélection de périodes temporelles (optionnel)
- [x] Permettre les opérateurs logiques : ET, OU
- [x] Afficher les résultats avec camembert et histogramme

### Phase 4 : Intégration et améliorations

#### 4.1 Page principale
**Fichier à modifier** :
- `front/src/pages/userspace/statistics/Index.vue`

**Tâches** :
- [x] Créer la navigation par onglets (Vue globale, Par catégorie, Mode avancé)
- [x] Gérer l'état de chargement et les erreurs
- [x] Afficher conditionnellement selon la disponibilité des readings

#### 4.2 Améliorations
**Tâches** :
- [x] Ajouter le helper `formatDuration()` pour formater les durées
- [x] Ajouter le computed `canCalculateStatistics` pour vérifier la disponibilité
- [x] Gérer les erreurs avec messages explicites
- [x] Ajouter des logs de debug pour le développement

---

## Fichiers créés/modifiés

### Backend

**Créés** :
- `api/src/core/observations/services/statistics.service.ts`
- `api/src/core/observations/controllers/statistics.controller.ts`
- `api/src/core/observations/dtos/statistics-general.dto.ts`
- `api/src/core/observations/dtos/statistics-category.dto.ts`
- `api/src/core/observations/dtos/statistics-conditional.dto.ts`

**Modifiés** :
- `api/src/core/observations/index.module.ts` : Ajout du service et controller

### Frontend

**Créés** :
- `front/src/services/observations/statistics.service.ts`
- `front/src/services/observations/statistics.interface.ts`
- `front/src/composables/use-statistics/index.ts`
- `front/src/pages/userspace/statistics/_components/GeneralStatisticsView.vue`
- `front/src/pages/userspace/statistics/_components/CategoryStatisticsView.vue`
- `front/src/pages/userspace/statistics/_components/ConditionalStatisticsView.vue`
- `front/src/pages/userspace/statistics/_components/AmChartsPieChart.vue`
- `front/src/pages/userspace/statistics/_components/AmChartsBarChart.vue`

**Modifiés** :
- `front/src/pages/userspace/statistics/Index.vue` : Remplacement de "En construction" par l'interface complète ; toggle **« Traiter les pauses comme un état séparé »** (défaut activé)

**Ajoutés (gestion des pauses, 2026)** :
- `front/src/composables/use-statistics/category-pie-chart.utils.ts` : construction des segments du camembert et dénominateur unifié
- `front/src/composables/use-statistics/__tests__/category-pie-chart.utils.test.ts` : tests (somme à 100 % en mode séparé)

---

## Notes techniques

### Types de catégories

Le système distingue deux types de catégories selon leur `action` dans le protocole :

- **Catégories continues** (`ProtocolItemActionEnum.Continuous` ou non spécifié) :
  - Les observables ont une durée d'état "on"
  - Un observable est "on" dès qu'il apparaît jusqu'à ce qu'un autre observable de la même catégorie apparaisse
  - Les statistiques incluent : durée totale, pourcentage, nombre d'occurrences

- **Catégories discrètes (one-shot)** (`ProtocolItemActionEnum.OneShot`) :
  - Les observables n'ont pas de durée, seulement des occurrences ponctuelles
  - Chaque reading DATA compte comme une occurrence
  - Les statistiques incluent uniquement : nombre d'occurrences

### Gestion des pauses

Une pause est une **métadonnée temporelle** (`PAUSE_START` / `PAUSE_END`). Elle ne coupe pas les états actifs sur le graphe (voir `docs/graph.md`, section Pauses). Côté statistiques, le comportement est piloté par une **option unique** dans la barre d'outils :

**« Traiter les pauses comme un état séparé »** (`treatPausesAsSeparateState`, défaut `true`, composable `use-statistics`).

#### Mode par défaut (option activée)

La pause est un **état à part entière** :
- Les périodes `PAUSE_START` à `PAUSE_END` sont identifiées (`calculatePausePeriods` dans `@actograph/core`).
- Le chevauchement avec les périodes « on » est calculé et **soustrait** des durées des observables continus (`calculatePauseOverlap`).
- La durée d'observation effective = durée totale − durée des pauses.
- Un segment **« Pause »** (gris) est ajouté au **camembert** lorsque `pauseDuration > 0`.
- Le camembert utilise un **dénominateur unique** : durée totale d'observation **incluant** les pauses (`totalCategoryDuration + pauseDuration`). Chaque part observable = durée active / dénominateur ; part Pause = durée de pause / dénominateur. La somme fait **100 %**.

En interne : `includePauses = false` (comportement historique de l'API backend).

#### Mode pauses transparentes (option désactivée)

Les pauses sont **fondues** dans les durées des observables :
- Aucune soustraction du chevauchement pause sur les périodes « on ».
- La durée d'observation effective = durée totale (pauses incluses).
- Aucun segment « Pause » séparé dans le camembert.

En interne : `includePauses = true` ; le front recalcule localement via `@actograph/core` (l'API backend conserve le comportement par défaut d'exclusion).

#### Cas particuliers

- **Catégories discrètes** (Évènements) : les pauses n'affectent pas le comptage des occurrences.
- **Pause orpheline** (`PAUSE_START` sans `PAUSE_END` correspondant, ou l'inverse) : ignorée silencieusement (voir `docs/reading.md`).
- **Mode chronomètre + vidéo** : aucun relevé de pause créé ; l'option n'a aucun effet (voir `docs/graph.md`).

### Performance

- Les calculs sont effectués côté backend pour éviter de surcharger le frontend
- Les readings sont triés par date avant les calculs
- Les périodes sont calculées de manière optimisée avec des algorithmes d'intersection/union

---

## Améliorations futures possibles

- Cache des statistiques calculées pour améliorer les performances
- Export des statistiques en PDF/CSV
- Statistiques croisées entre catégories (#32)
- Graphiques temporels (évolution dans le temps)
- Comparaison entre observations

