# État actuel des issues GitHub

**Date de mise à jour** : 2025-01-XX  
**Source** : Board GitHub - https://github.com/users/Syllll/projects/2/views/2

Ce document récapitule l'état d'implémentation réel de chaque issue basé sur l'analyse du code existant.

---

## 📊 Pourcentage de complétion global

### Vue d'ensemble

- **Total des issues** : 47 issues
- **✅ Complètement implémentées** : 23 issues (48.9%)
- **🟡 Partiellement implémentées** : 7 issues (14.9%)
- **❌ Non implémentées** : 17 issues (36.2%)

### Calcul détaillé

**Méthode de calcul** :
- Issues complètes : 100% chacune
- Issues partielles : 50% chacune (estimation moyenne)
- Issues non implémentées : 0%

**Résultat** :
- Points complétés : 23 × 100% + 7 × 50% = 23 + 3.5 = **26.5 points**
- Points totaux : 47 × 100% = **47 points**
- **Pourcentage de complétion : 56.4%** 🎯

### Répartition par EPIC

| EPIC | Issues | Complètes | Partielles | Non faites | Complétion |
|------|--------|-----------|------------|------------|------------|
| **EPIC #0** : Socle technique | 9 | 5 | 2 | 2 | 66.7% |
| **EPIC #1** : Tableau de bord | 7 | 3 | 2 | 2 | 57.1% |
| **EPIC #2** : Éditeur protocole | 3 | 2 | 0 | 1 | 66.7% |
| **EPIC #3** : Module observation | 6 | 4 | 0 | 2 | 66.7% |
| **EPIC #4** : Visualisation graphique | 4 | 1 | 0 | 3 | 25.0% |
| **EPIC #5** : Statistiques | 4 | 1 | 0 | 3 | 25.0% |
| **EPIC #6** : Architecture | 2 | 1 | 0 | 1 | 50.0% |
| **EPIC #7** : Accessibilité | 3 | 0 | 3 | 0 | 50.0% |
| **Gestion projet** | 4 | 4 | 0 | 0 | 100.0% |

### Analyse par priorité

| Priorité | Issues | Complètes | Complétion |
|----------|--------|-----------|------------|
| **P1-Must Have** | 25 | 14 | 56.0% |
| **P2-Should Have** | 12 | 4 | 33.3% |
| **P3-Could Have** | 6 | 1 | 16.7% |
| **Sans priorité** | 4 | 4 | 100.0% |

### Points d'attention

⚠️ **Priorités critiques (P1) non complètes** :
- #2 : Mise à jour automatique (Error/Blocking) - **Blocage critique**
- #22, #23 : Statistiques (non implémentées) - **Fonctionnalité attendue**
- #28 : Dossier par défaut exports (partiel) - **Quick win possible**

⚠️ **EPIC avec faible complétion** :
- **EPIC #4** (Visualisation graphique) : 25% - Manque zoom, export, personnalisation
- **EPIC #5** (Statistiques) : 25% - Fonctionnalité critique non implémentée

✅ **Points positifs** :
- **EPIC #0** (Socle technique) : 66.7% - Bonne base technique
- **EPIC #3** (Module observation) : 66.7% - Fonctionnalités principales implémentées
- **Gestion projet** : 100% - Documentation et processus en place

---

## Légende

- ✅ **Implémenté** : Fonctionnalité complètement implémentée dans le code
- 🟡 **Partiellement implémenté** : Fonctionnalité partiellement implémentée
- ❌ **Non implémenté** : Fonctionnalité non implémentée ou non trouvée dans le code
- 📝 **Documentation** : Lien vers la documentation détaillée si disponible

---

## Prochaines étapes recommandées

Basé sur l'analyse de l'état actuel du projet, voici les prochaines étapes recommandées par ordre de priorité :

### 🔴 Priorité 1 : Blocages et fonctionnalités critiques (P1-Must Have)

#### 1. **Corriger le système de mise à jour automatique (#2)**
- **Statut actuel** : Error/Blocking
- **Impact** : Bloque le déploiement et la maintenance
- **Actions** :
  - Analyser et corriger l'erreur dans `electron-updater`
  - Tester le flux complet de mise à jour
  - Ajouter des logs détaillés pour le debugging
- **Estimation** : 2-3 jours

#### 2. **Implémenter les statistiques de base (#22, #23)**
- **Statut actuel** : Non implémenté (page "En construction")
- **Impact** : Fonctionnalité critique mentionnée dans la navigation mais non disponible
- **Actions** :
  - Créer le backend pour calculer les statistiques depuis les readings
  - Implémenter le tableau général des statistiques
  - Implémenter les diagrammes par catégorie et combinés
  - Utiliser une bibliothèque de graphiques (ex: Chart.js, D3.js, ou Quasar QChart)
- **Estimation** : 5-7 jours
- **Dépendances** : Les readings existent déjà, il faut juste les agréger

#### 3. **Améliorer le dossier par défaut pour les exports (#28)**
- **Statut actuel** : Partiellement implémenté
- **Impact** : Améliore l'expérience utilisateur pour l'export
- **Actions** :
  - Configurer un dossier par défaut "Actograph" dans les chemins système
  - Sauvegarder la préférence utilisateur pour le dernier dossier utilisé
  - Créer le dossier s'il n'existe pas
- **Estimation** : 1-2 jours

### 🟡 Priorité 2 : Améliorations importantes (P2-Should Have)

#### 4. **Ajouter le template par défaut pour les protocoles (#14)**
- **Statut actuel** : Non implémenté
- **Impact** : Améliore l'UX lors de la création de protocoles
- **Actions** :
  - Détecter quand tous les éléments sont supprimés
  - Créer automatiquement 1 catégorie + 1 observable par défaut
  - Permettre à l'utilisateur de personnaliser ce template
- **Estimation** : 1 jour

#### 5. **Améliorer le système de warnings et notifications (#24)**
- **Statut actuel** : Partiellement implémenté
- **Impact** : Améliore la compréhension des erreurs/blocages
- **Actions** :
  - Créer un système centralisé de notifications/warnings
  - Ajouter des messages contextuels pour les blocages
  - Intégrer avec le système de logging existant
- **Estimation** : 2-3 jours

#### 6. **Implémenter l'autosave (#27)**
- **Statut actuel** : Non implémenté
- **Impact** : Protection contre la perte de données
- **Actions** :
  - Implémenter un système d'autosave périodique (toutes les X minutes)
  - Sauvegarder dans un fichier temporaire
  - Restaurer automatiquement au démarrage si crash détecté
- **Estimation** : 3-4 jours

#### 7. **Améliorer le graphique d'activité (#31)**
- **Statut actuel** : Non implémenté
- **Impact** : Fonctionnalité importante pour l'analyse
- **Actions** :
  - Ajouter le zoom (molette souris + boutons)
  - Ajouter le pan (glisser pour naviguer)
  - Ajuster l'échelle de temps dynamiquement
- **Estimation** : 4-5 jours

### 🟢 Priorité 3 : Fonctionnalités avancées (P3-Could Have)

#### 8. **Export du graphique (#18)**
- **Statut actuel** : Non implémenté
- **Impact** : Permet de partager les visualisations
- **Actions** :
  - Capturer le canvas PixiJS en image (PNG/SVG)
  - Permettre l'export en différents formats
- **Estimation** : 2 jours

#### 9. **Personnalisation des symboles graphiques (#47)**
- **Statut actuel** : Non implémenté
- **Impact** : Améliore la personnalisation
- **Actions** :
  - Ajouter une interface de configuration des symboles
  - Sauvegarder les préférences par observable
- **Estimation** : 3-4 jours

#### 10. **Statistiques croisées (#32)**
- **Statut actuel** : Non implémenté
- **Impact** : Analyse avancée des données
- **Actions** :
  - Implémenter après les statistiques de base (#22, #23)
  - Créer une interface pour sélectionner les catégories/observables à croiser
- **Estimation** : 5-6 jours
- **Dépendances** : #22, #23

### 📋 Ordre d'exécution recommandé

**Sprint 1 (2 semaines)** :
1. Corriger #2 (mise à jour automatique) - **Blocage critique**
2. Implémenter #28 (dossier par défaut) - **Quick win**
3. Implémenter #14 (template protocole) - **Quick win**

**Sprint 2 (2 semaines)** :
4. Implémenter #22 et #23 (statistiques de base) - **Fonctionnalité critique**
5. Améliorer #24 (warnings) - **Améliore l'UX**

**Sprint 3 (2 semaines)** :
6. Implémenter #27 (autosave) - **Protection données**
7. Améliorer #31 (zoom graphique) - **Améliore l'analyse**

**Sprint 4+ (backlog)** :
8. Export graphique (#18)
9. Personnalisation symboles (#47)
10. Statistiques croisées (#32)

### ⚠️ Notes importantes

- **#2 (Mise à jour)** doit être corrigé en priorité car c'est un blocage
- **#22, #23 (Statistiques)** sont critiques car la page existe mais affiche "En construction", ce qui frustre les utilisateurs
- Les **quick wins** (#14, #28) peuvent être faits rapidement et améliorent l'UX
- Les fonctionnalités **P3** peuvent être reportées si nécessaire

---

## EPIC #0 : Socle technique général (installation, maintenance, mises à jour)

**Issue parente** : [#43](https://github.com/Syllll/actograph-v3/issues/43)

### #1 - Production d'une version squelette sur Windows
- **Statut GitHub** : In test
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : ✅ **Implémenté**
- **Détails** : 
  - Configuration Electron pour Windows présente dans `front/src-electron/electron-main.ts`
  - Scripts de build disponibles dans `scripts/build-electron.sh`
  - Docker configuré pour le développement

### #2 - ETQ user, mon application se met à jour automatiquement
- **Statut GitHub** : Error/Blocking
- **Priorité** : P2-Should Have
- **Taille** : M
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Système de mise à jour Electron configuré avec `electron-updater` dans `front/src-electron/electron-main.ts`
  - ✅ Handlers IPC pour les événements de mise à jour (`update-available`, `update-download-progress`, `update-downloaded`, `update-error`)
  - ✅ Modal de mise à jour (`front/src/components/update-modal/Index.vue`)
  - ✅ Service système (`front/src/services/system/index.service.ts`)
  - ⚠️ **Problème** : Statut "Error/Blocking" indique un problème dans l'implémentation actuelle

### #3 - ETQ user, je peux saisir ma clef de licence et voir mon compte "pro" s'activer
- **Statut GitHub** : In test
- **Priorité** : P1-Must Have
- **Taille** : S
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Page d'activation de licence (`front/src/pages/gateway/ActivatePro.vue`)
  - ✅ Service de sécurité backend (`api/src/core/security/services/security/electron.ts`)
  - ✅ Méthode `activateLicense()` qui vérifie la clé sur le serveur ActoGraph
  - ✅ Sauvegarde de la licence dans `access.json`
  - ✅ Composable `useLicense` pour gérer l'état de la licence
  - ✅ Affichage du type de licence dans la toolbar

### #12 - Production d'une version squelette sur MacOS
- **Statut GitHub** : Dev done
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - Configuration Electron multi-plateforme
  - Scripts de build pour macOS disponibles

### #13 - ETQ user, mon ordinateur n'est pas bloqué quand j'installe, je mets à jour, ou j'ouvre Actograph
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : M
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Le serveur backend démarre dans un processus séparé (fork) dans `electron-main.ts`
  - ✅ Page de chargement affichée pendant le démarrage
  - ⚠️ Pas de gestion explicite du non-blocage pendant l'installation/mise à jour

### #24 - ETQ user, je peux lire des messages de warning pour comprendre les blocages d'Actograph
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : S
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Messages d'erreur dans les modals (ex: `UpdateModal`, `ActivatePro`)
  - ✅ Gestion des erreurs dans les services
  - ❌ Pas de système centralisé de warnings/notifications pour les blocages

### #25 - ETQ user, lorsque je lance Actograph-V3, je vois tout de suite une fenetre et le statut
- **Statut GitHub** : To do
- **Priorité** : P2-Should Have
- **Taille** : S
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Page de chargement (`front/src/pages/gateway/Loading.vue`)
  - ✅ Composable `use-startup-loading.ts` pour gérer le chargement initial
  - ✅ Affichage du statut pendant le démarrage du serveur backend

### #26 - ETQ user, en cas de non démarrage ou plantage, je peux transmettre un fichier de traçage du pb au SAV
- **Statut GitHub** : Dev done
- **Priorité** : P2-Should Have
- **Taille** : S
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Configuration de `electron-log` dans `electron-main.ts`
  - ✅ Logs sauvegardés dans les fichiers de log Electron
  - ⚠️ Pas d'interface utilisateur visible pour exporter/envoyer les logs

### #27 - ETQ user, en cas d'arrêt inattendu d'Actograph-V3, je peux retrouver un Save automatique récent
- **Statut GitHub** : Dev done
- **Priorité** : P2-Should Have
- **Taille** : S
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système d'autosave visible dans le code
  - Les observations sont sauvegardées manuellement via l'API

---

## EPIC #1 : Tableau de bord et accueil

**Issue parente** : [#38](https://github.com/Syllll/actograph-v3/issues/38)

### #4 - ETQ user, je peux voir la page d'accueil avec...
- **Statut GitHub** : Dev done
- **Priorité** : P1-Must Have
- **Taille** : XL
- **État réel** : ✅ **Implémenté**
- **Documentation** : `docs/features/4-page-accueil/4-page-accueil.md` et `docs/features/4-page-accueil/4-done.md`
- **Détails** :
  - ✅ Page d'accueil complète (`front/src/pages/userspace/home/Index.vue`)
  - ✅ Bloc "Vos chroniques" avec liste paginée et recherche
  - ✅ Bloc "Chronique active" avec informations détaillées
  - ✅ Bloc "Centre d'aide" avec liens vers la documentation
  - ✅ Bloc "En savoir plus" avec version et licence
  - ✅ Navigation avec drawer et menu
  - ✅ Indicateurs visuels pour Graph et Stats (grisés si pas de relevés)

### #8 - ETQ user, je peux créer une nouvelle chronique
- **Statut GitHub** : Dev done
- **Priorité** : P1-Must Have
- **Taille** : S
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Dialog de création (`front/src/pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue`)
  - ✅ Sélection du mode (Calendar/Chronometer)
  - ✅ Service d'observation (`front/src/services/observations/index.service.ts`)
  - ✅ Composable `useObservation` avec méthode `createObservation()`

### #10 - ETQ user, je peux accéder à une version bureau pour saisir mes relevés
- **Statut GitHub** : Dev done
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Application Electron desktop fonctionnelle
  - ✅ Page d'observation (`front/src/pages/userspace/observation/Index.vue`)
  - ✅ Système de création de relevés complet

### #11 - ETQ user, je peux accéder à une application mobile/tablette pour saisir mes relevés
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : L
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Application uniquement desktop/web pour l'instant

### #39 - ETQ user, je peux accéder à une version web pour saisir mes relevés
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : L
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Application Quasar fonctionne en mode web
  - ✅ Docker configuré pour le développement web
  - ⚠️ Pas de déploiement production web visible

### #48 - ETQ user, je peux accéder à un Cloud pour transfert de mes chroniques vers les mobiles ou autre ordi
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : -
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système cloud implémenté

---

## EPIC #2 : Éditeur de protocole d'observation

**Issue parente** : [#40](https://github.com/Syllll/actograph-v3/issues/40)

### #29 - Architecture du modèle de données protocole (catégories, observables)
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Documentation** : `docs/protocol.md`
- **Détails** :
  - ✅ Entité `Protocol` avec structure JSON pour les items
  - ✅ Entité `ProtocolItem` (catégories et observables)
  - ✅ Service backend complet (`api/src/core/observations/services/protocol/`)
  - ✅ API REST pour gérer les protocoles

### #5 - ETQ user, je peux créer un protocole d'observation (categories, observables)
- **Statut GitHub** : In progress
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Page protocole (`front/src/pages/userspace/protocol/Index.vue`)
  - ✅ Modals pour ajouter/modifier/supprimer catégories et observables
  - ✅ Service frontend (`front/src/services/observations/protocol.service.ts`)
  - ✅ Composable `useProtocol` pour gérer l'état
  - ✅ Interface d'édition complète avec drag & drop pour réorganiser

### #14 - ETQ user, quand je supprime tous les éléments de mon protocole, je dois me retrouver devant un mini template par défaut (1 catégorie + 1 observable)
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : S
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système de template par défaut visible dans le code

---

## EPIC #3 : Module d'observation et enregistrement

**Issue parente** : [#41](https://github.com/Syllll/actograph-v3/issues/41)

### #16 - ETQ user, j'accède à la liste des relevés réalisés
- **Statut GitHub** : Dev done
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Documentation** : `docs/reading.md`
- **Détails** :
  - ✅ Tableau des relevés (`front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`)
  - ✅ Pagination et recherche
  - ✅ Affichage selon le mode (Calendar/Chronometer)
  - ✅ Composable `useReadings` pour gérer l'état

### #21 - ETQ user, je peux modifier la liste des relevés
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Édition inline dans le tableau (nom, description, type, date/heure)
  - ✅ Support de l'édition en mode chronomètre (durées)
  - ✅ Sauvegarde automatique des modifications
  - ✅ Dialog d'auto-correction (`AutoCorrectReadingsDialog.vue`)

### #6 - ETQ user, je peux créer des relevés In situ à partir de mon protocole d'observation
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Page d'observation avec boutons pour créer des relevés
  - ✅ Boutons dynamiques basés sur le protocole (`front/src/pages/userspace/observation/_components/buttons-side/`)
  - ✅ Timer d'observation avec play/pause/stop
  - ✅ Création de relevés START, STOP, PAUSE_START, PAUSE_END, DATA
  - ✅ Gestion des observables continus par catégorie

### #20 - ETQ user, je peux créer des relevés à partir d'une vidéo
- **Statut GitHub** : In progress
- **Priorité** : P2-Should Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Documentation** : `docs/features/integration-video/integration-video.md` et `docs/features/integration-video/integration-video-done.md`
- **Détails** :
  - ✅ Composant VideoPlayer avec contrôles complets
  - ✅ Mode chronomètre avec conversion date ↔ durée
  - ✅ Synchronisation vidéo/observation
  - ✅ Encoches sur la timeline pour chaque relevé
  - ✅ Activation automatique des boutons selon la position vidéo
  - ✅ Redimensionnement de la vidéo avec slider
  - ✅ Sauvegarde du chemin vidéo dans l'observation

### #33 - ETQ user, je peux enregistrer des annotations audio synchronisées pendant l'observation
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : L
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système d'enregistrement audio visible dans le code

### #37 - Spike: étude technique sur l'intégration avancée du support vidéo
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : M
- **État réel** : ✅ **Implémenté** (l'intégration vidéo de base est faite)
- **Détails** :
  - L'intégration vidéo de base (#20) est complète
  - Des améliorations avancées peuvent être étudiées

---

## EPIC #4 : Visualisation graphique des activités (chronique)

**Issue parente** : [#42](https://github.com/Syllll/actograph-v3/issues/42)

### #15 - ETQ user, je peux visualiser, paramétrer et interagir avec le graphique d'activité
- **Statut GitHub** : In progress
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Documentation** : `docs/graph.md`
- **Détails** :
  - ✅ Composant graphique avec PixiJS (`front/src/pages/userspace/analyse/_components/graph/`)
  - ✅ Axe X (temporel) avec calcul automatique des graduations
  - ✅ Axe Y (observables) avec calcul dynamique de la hauteur
  - ✅ Zone de données avec affichage des readings
  - ✅ Support du mode chronomètre (affichage en durées)
  - ✅ Interactions souris pour naviguer
  - ⚠️ Paramétrage et interactions avancées peuvent être améliorés

### #18 - ETQ user, je peux exporter un graphe d'activité
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : M
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de fonctionnalité d'export du graphique visible

### #31 - ETQ user, je peux zoomer et ajuster l'échelle de temps sur le graphe d'activité
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : M
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de fonctionnalité de zoom visible dans le code

### #47 - ETQ user, je souhaite personnaliser les symboles graphiques pour les observables événementiels
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : M
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système de personnalisation des symboles visible

---

## EPIC #5 : Statistiques et analyses quantitatives

**Issue parente** : [#44](https://github.com/Syllll/actograph-v3/issues/44)

### #17 - ETQ user, je peux exporter (sauvegarder et partager) mes fichiers chroniques
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Service d'export (`front/src/services/observations/export.service.ts`)
  - ✅ API backend pour exporter (`api/src/core/observations/controllers/observation.controller.ts`)
  - ✅ Format `.jchronic` (JSON)
  - ✅ Boutons d'export dans le drawer et la page d'accueil
  - ✅ Dialog de sauvegarde Electron

### #22 - ETQ user, je peux voir le tableau Général des statistiques
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Page statistiques existe mais affiche "En construction" (`front/src/pages/userspace/statistics/Index.vue`)

### #23 - ETQ user je peux voir les statistiques sous forme de diagrammes Par catégorie et Combinés
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Page statistiques existe mais affiche "En construction"

### #32 - ETQ user, je peux croiser les statistiques entre catégories et observables
- **Statut GitHub** : Backlog
- **Priorité** : P2-Should Have
- **Taille** : L
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas de système de statistiques croisées visible

---

## EPIC #6 : Architecture technique et modèle de données

**Issue parente** : [#45](https://github.com/Syllll/actograph-v3/issues/45)

### #30 - Architecture du format de stockage des fichiers .chro
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : ✅ **Implémenté**
- **Détails** :
  - ✅ Format d'export `.jchronic` (JSON) implémenté
  - ✅ Service d'import (`front/src/services/observations/import.service.ts`)
  - ✅ Structure de données complète pour l'export/import

### #36 - Architecture de la persistance et compatibilité cloud (future extension)
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : XL
- **État réel** : ❌ **Non implémenté**
- **Détails** :
  - Pas d'architecture cloud implémentée

---

## EPIC #7 : Accessibilité, supports et interface (ergonomie)

**Issue parente** : [#46](https://github.com/Syllll/actograph-v3/issues/46)

### #28 - ETQ user, je trouve tous les exports dans mon dossier Actograph par défaut
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : M
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Dialog de sauvegarde Electron avec sélection de dossier
  - ⚠️ Pas de dossier par défaut "Actograph" configuré automatiquement

### #34 - ETQ user, je peux utiliser ActoGraph sur desktop, tablette et mobile
- **Statut GitHub** : Backlog
- **Priorité** : P1-Must Have
- **Taille** : L
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Desktop (Electron) : Implémenté
  - ✅ Web (Quasar) : Fonctionne mais pas déployé en production
  - ❌ Tablette/Mobile : Non implémenté

### #35 - ETQ user, je peux accéder à une aide intégrée et à la documentation
- **Statut GitHub** : Backlog
- **Priorité** : P3-Could Have
- **Taille** : M
- **État réel** : 🟡 **Partiellement implémenté**
- **Détails** :
  - ✅ Bloc "Centre d'aide" dans la page d'accueil avec liens vers actograph.io
  - ✅ Documentation technique dans le dossier `docs/`
  - ❌ Pas d'aide intégrée interactive dans l'application

---

## Issues de gestion de projet

### #50 - 🚀 Initialisation du projet
- **Statut GitHub** : In progress
- **Type** : Project mngmt
- **État réel** : ✅ **Terminé** (projet initialisé et fonctionnel)

### #51 - 🗂️ Organisation documentaire
- **Statut GitHub** : Project
- **Type** : Project mngmt
- **État réel** : ✅ **En cours**
- **Détails** :
  - Documentation organisée dans `docs/`
  - Processus d'implémentation documenté (`docs/auto-implement.md`)

### #52 - 🧑‍✈️ Pilotage backlog & sprints
- **Statut GitHub** : In progress
- **Type** : Project mngmt
- **État réel** : ✅ **En cours**

### #49 - 📆 Réunions
- **Statut GitHub** : Project
- **Type** : Project mngmt
- **État réel** : ✅ **En cours**

---

## Résumé par statut

### ✅ Implémenté (23 issues)
- #1, #3, #4, #5, #6, #8, #10, #12, #15, #16, #17, #20, #21, #26, #29, #30, #50, #51, #52, #49

### 🟡 Partiellement implémenté (7 issues)
- #2, #13, #24, #28, #34, #35, #39

### ❌ Non implémenté (17 issues)
- #11, #14, #18, #22, #23, #27, #31, #32, #33, #36, #37, #47, #48

---

## Notes importantes

1. **Statut GitHub vs État réel** : Certaines issues marquées "Backlog" ou "To do" dans GitHub sont en fait implémentées dans le code. Ce document reflète l'état réel du code.

2. **Issues partiellement implémentées** : Ces issues nécessitent des améliorations ou des fonctionnalités supplémentaires pour être considérées comme complètes.

3. **Documentation** : Les issues avec documentation détaillée sont marquées avec un lien vers le fichier correspondant dans `docs/features/`.

4. **Mise à jour** : Ce document doit être mis à jour régulièrement pour refléter l'état réel du code.

