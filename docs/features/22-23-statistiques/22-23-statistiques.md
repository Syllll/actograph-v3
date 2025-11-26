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

## Fonctionnalités implémentées

### 1. Vue globale des statistiques

**Composant** : `front/src/pages/userspace/statistics/_components/GeneralStatisticsView.vue`

**Fonctionnalités** :
- ✅ Tableau des statistiques générales :
  - Durée totale d'observation (START à STOP)
  - Durée d'observation effective (moins les pauses)
  - Nombre total de readings
  - Nombre de pauses
  - Durée totale des pauses
- ✅ Tableau des statistiques par catégorie :
  - Nombre d'observables actifs par catégorie
  - Durée totale d'état "on" pour tous les observables de la catégorie

**Backend** :
- Endpoint : `GET /observations/:id/statistics/general`
- Service : `StatisticsService.getGeneralStatistics()`
- DTO : `GeneralStatisticsDto`, `CategoryStatisticsSummaryDto`

---

### 2. Vue par catégorie avec diagrammes

**Composant** : `front/src/pages/userspace/statistics/_components/CategoryStatisticsView.vue`

**Fonctionnalités** :
- ✅ Sélecteur de catégorie
- ✅ **Camembert (PieChart)** : Pourcentage d'état "on" pour chaque observable
  - Composant : `front/src/pages/userspace/statistics/_components/PieChart.vue`
  - Affichage interactif avec survol
  - Légende avec pourcentages
- ✅ **Histogramme (BarChart)** : Durée d'état "on" pour chaque observable
  - Composant : `front/src/pages/userspace/statistics/_components/BarChart.vue`
  - Barres horizontales avec durées formatées
  - Comparaison visuelle entre observables

**Backend** :
- Endpoint : `GET /observations/:id/statistics/category/:categoryId`
- Service : `StatisticsService.getCategoryStatistics()`
- DTO : `CategoryStatisticsDto`, `ObservableStatisticsDto`

**Calculs** :
- Durée d'état "on" : Somme des périodes entre START et STOP pour chaque observable
- Gestion des pauses : Exclusion des périodes PAUSE_START à PAUSE_END
- Pourcentage : (Durée "on" / Durée totale d'observation) × 100

---

### 3. Mode avancé avec conditions

**Composant** : `front/src/pages/userspace/statistics/_components/ConditionalStatisticsView.vue`

**Fonctionnalités** :
- ✅ Construction de conditions multiples :
  - Sélection d'observables avec état ("on" ou "off")
  - Sélection de périodes temporelles (optionnel)
  - Opérateurs logiques : ET, OU
  - Chaînage de groupes de conditions
- ✅ Application des conditions pour filtrer les périodes
- ✅ Calcul des statistiques sur les périodes filtrées
- ✅ Affichage des résultats avec camembert et histogramme

**Backend** :
- Endpoint : `POST /observations/:id/statistics/conditional`
- Service : `StatisticsService.getConditionalStatistics()`
- DTO : `ConditionalStatisticsRequestDto`, `ConditionalStatisticsDto`

**Logique de conditions** :
- Opérateurs ET/OU entre observables dans un groupe
- Opérateurs ET/OU entre groupes de conditions
- Filtrage temporel optionnel par groupe
- Calcul des périodes d'intersection/union selon les opérateurs

---

## Architecture technique

### Backend

**Service** : `api/src/core/observations/services/statistics.service.ts`
- `getGeneralStatistics(observationId)` : Vue globale
- `getCategoryStatistics(observationId, categoryId)` : Par catégorie
- `getConditionalStatistics(observationId, request)` : Mode avancé
- Méthodes privées pour les calculs :
  - `calculatePausePeriods()` : Calcul des périodes de pause
  - `calculateObservableDurations()` : Calcul des durées "on"
  - `calculatePauseOverlap()` : Calcul du chevauchement avec les pauses
  - `applyConditions()` : Application des conditions logiques
  - `findObservablePeriods()` : Recherche des périodes d'état
  - `intersectPeriods()` / `unionPeriods()` : Opérations sur les périodes

**Controller** : `api/src/core/observations/controllers/statistics.controller.ts`
- Routes protégées avec `JwtAuthGuard` et `UserRolesGuard`
- Vérification des permissions d'accès à l'observation

**DTOs** :
- `api/src/core/observations/dtos/statistics-general.dto.ts`
- `api/src/core/observations/dtos/statistics-category.dto.ts`
- `api/src/core/observations/dtos/statistics-conditional.dto.ts`

**Logs** :
- Logger NestJS intégré pour le debugging
- Logs de debug pour les calculs
- Logs de warning pour les erreurs

### Frontend

**Service** : `front/src/services/observations/statistics.service.ts`
- Appels API vers les endpoints de statistiques

**Composable** : `front/src/composables/use-statistics/index.ts`
- Gestion de l'état des statistiques
- Méthodes de chargement des différentes vues
- Helper `formatDuration()` pour formater les durées
- Computed `canCalculateStatistics` pour vérifier la disponibilité des données

**Page principale** : `front/src/pages/userspace/statistics/Index.vue`
- Navigation par onglets (Vue globale, Par catégorie, Mode avancé)
- Gestion de l'état de chargement et des erreurs
- Affichage conditionnel selon la disponibilité des readings

**Composants graphiques** :
- `PieChart.vue` : Camembert SVG interactif
- `BarChart.vue` : Histogramme SVG avec barres horizontales

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
- `front/src/pages/userspace/statistics/_components/PieChart.vue`
- `front/src/pages/userspace/statistics/_components/BarChart.vue`

**Modifiés** :
- `front/src/pages/userspace/statistics/Index.vue` : Remplacement de "En construction" par l'interface complète

---

## Exemples d'utilisation

### Vue globale

L'utilisateur voit un tableau avec :
- Durée totale : 2h 30min
- Durée effective : 2h 15min (moins 15min de pauses)
- Nombre de readings : 150
- Nombre de pauses : 3
- Par catégorie :
  - Catégorie 1 : 3 observables actifs, durée totale "on" : 45min
  - Catégorie 2 : 2 observables actifs, durée totale "on" : 30min

### Vue par catégorie

L'utilisateur sélectionne "Catégorie 1" et voit :
- **Camembert** :
  - Observable A : 60% du temps "on"
  - Observable B : 30% du temps "on"
  - Observable C : 10% du temps "on"
- **Histogramme** :
  - Observable A : 27min "on"
  - Observable B : 13min 30s "on"
  - Observable C : 4min 30s "on"

### Mode avancé

L'utilisateur construit une condition :
- **Groupe 1** : Observable X = "on" ET Observable Y = "off"
- **Opérateur entre groupes** : OU
- **Groupe 2** : Observable Z = "on"
- **Catégorie cible** : Catégorie 1

Résultat : Statistiques de la Catégorie 1 calculées uniquement sur les périodes où les conditions sont remplies.

---

## Notes techniques

### Gestion des pauses

Les pauses sont automatiquement exclues des calculs de durées :
- Les périodes PAUSE_START à PAUSE_END sont identifiées
- Le chevauchement avec les périodes "on" est calculé et soustrait
- La durée d'observation effective = Durée totale - Durée des pauses

### Performance

- Les calculs sont effectués côté backend pour éviter de surcharger le frontend
- Les readings sont triés par date avant les calculs
- Les périodes sont calculées de manière optimisée avec des algorithmes d'intersection/union

### Gestion des erreurs

- Vérification de l'existence de l'observation
- Vérification de l'existence du protocole et des readings
- Vérification de l'existence des catégories
- Messages d'erreur explicites pour l'utilisateur
- Logs détaillés pour le debugging

---

## Améliorations futures possibles

- Cache des statistiques calculées pour améliorer les performances
- Export des statistiques en PDF/CSV
- Statistiques croisées entre catégories (#32)
- Graphiques temporels (évolution dans le temps)
- Comparaison entre observations

---

## Date d'implémentation

**Date** : 2025-01-XX  
**Statut** : ✅ Complété

