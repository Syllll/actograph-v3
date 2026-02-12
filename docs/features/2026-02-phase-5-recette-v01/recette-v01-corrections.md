# Recette V0.1 - Plan de corrections

**Document source** : "Actograph V3 – version 0.0.93 - Recette V0.1 - février 2026" par Valérie Zara-Meylan
**Auteur du plan** : Sylvain Meylan
**Date** : 12 février 2026

> **Contexte** : Ce plan recense et organise toutes les corrections identifiées lors de la recette V0.1
> réalisée par Valérie Zara-Meylan sur ActoGraph V3 (version 0.0.93).
> Les anomalies sont classées par priorité, par zone fonctionnelle et par type.

---

## Légende

### Priorités

| Priorité | Description |
|----------|-------------|
| **P1 - Critique** | Bug bloquant, perte de données, crash ou fonctionnalité inutilisable |
| **P2 - Haute** | Bug impactant fortement l'UX ou empêchant un workflow important |
| **P3 - Moyenne** | Amélioration UX importante, fonctionnalité manquante attendue |
| **P4 - Basse** | Nice-to-have, cosmétique, fonctionnalités futures |

### Types

| Type | Description |
|------|-------------|
| **BUG** | Fonctionnalité existante qui ne marche pas ou mal |
| **FEATURE** | Fonctionnalité absente à créer |
| **UX** | Amélioration visuelle ou ergonomique d'une fonctionnalité existante |

### Statuts

- ✅ Déjà implémenté / fonctionnel
- ❌ À corriger / À créer
- ⚠️ Partiellement fonctionnel / dégradé

---

## Chapitre 0 - Page d'accueil / Tableau de bord

### 0.1 Identifiant utilisateur tronqué [P2] [BUG] ❌
**Constat** : L'identifiant est tronqué ("valer" au lieu du nom complet).
**Fichiers concernés** :
- `front/src/pages/userspace/home/Index.vue` ou composants d'affichage du profil
- `front/src/pages/userspace/_components/drawer/`

**Tâches** :
- [ ] Identifier le composant qui affiche l'identifiant utilisateur
- [ ] Corriger le troncage (CSS overflow ou limitation de caractères)
- [ ] Vérifier que le nom complet s'affiche correctement

---

### 0.2 Langue FR non indiquée [P3] [UX] ❌
**Constat** : La langue française n'est pas indiquée dans l'interface.
**Fichiers concernés** :
- `front/src/pages/userspace/home/Index.vue`
- `front/src/i18n/`

**Tâches** :
- [ ] Afficher l'indicateur de langue courante (FR) sur la page d'accueil
- [ ] Vérifier la cohérence avec le système i18n existant

---

### 0.3 "Save As" - Impossible de sauvegarder sous un autre nom [P1] [BUG] ❌
**Constat** : On ne peut pas sauvegarder une chronique sous un autre nom. Script : charger "Exemple", modifier, vouloir sauvegarder sous un nouveau nom → impossible.
**Fichiers concernés** :
- `front/src/services/observations/autosave.service.ts`
- `front/src/composables/use-autosave/index.ts`
- `front/src/pages/userspace/home/Index.vue`

**Tâches** :
- [ ] Implémenter la fonctionnalité "Save As" (sauvegarder sous un autre nom)
- [ ] Ajouter un dialog de saisie du nouveau nom
- [ ] Mettre à jour le nom de la chronique en cours après le "Save As"

---

### 0.4 Fenêtre blanche bloquante au chargement [P2] [BUG] ❌
**Constat** : Lors du chargement d'une chronique, une fenêtre blanche s'ouvre et bloque l'utilisation de l'ordinateur pendant 5 à 8 secondes.
**Fichiers concernés** :
- `front/src/composables/use-autosave/index.ts`
- `front/src/pages/userspace/home/Index.vue`

**Tâches** :
- [ ] Identifier la cause du blocage (chargement synchrone ? modal bloquante ?)
- [ ] Ajouter un indicateur de chargement non-bloquant (spinner/skeleton)
- [ ] Optimiser le chargement pour ne pas bloquer l'interface

---

### 0.5 Dossier par défaut inconnu [P2] [BUG] ❌
**Constat** : L'utilisateur ne sait pas où se trouve le fichier sauvegardé. Le dossier par défaut devrait être "Mes Documents" et non le dossier système Actograph.
**Fichiers concernés** :
- `front/src/services/observations/autosave.service.ts`
- `front/src/composables/use-autosave/index.ts`
- Configuration Electron (si applicable)

**Tâches** :
- [ ] Changer le dossier par défaut vers "Mes Documents" de l'utilisateur
- [ ] Afficher le chemin du fichier quelque part dans l'interface (tooltip ou info)
- [ ] Vérifier la cohérence entre mode web et mode Electron

---

### 0.6 Historique - Date de dernière modification incorrecte [P2] [BUG] ❌
**Constat** : L'historique des chroniques affiche les fichiers, mais la date de dernière modification est incorrecte.
**Fichiers concernés** :
- `front/src/pages/userspace/home/Index.vue` (section historique)
- `front/src/composables/use-autosave/index.ts`
- `front/src/services/observations/autosave.service.ts`

**Tâches** :
- [ ] Identifier d'où provient la date affichée (métadonnées fichier vs données internes)
- [ ] Corriger le calcul/affichage de la date de dernière modification
- [ ] Vérifier le format d'affichage de la date

---

### 0.7 Cloud - Envoi vers le cloud : chroniques introuvables [P2] [BUG] ❌
**Constat** (Script 0.1) : L'envoi vers le Cloud ouvre "Mes Documents" mais l'utilisateur ne sait pas où sont ses chroniques.
**Fichiers concernés** :
- `front/src/composables/use-cloud/index.ts`
- `front/src/services/cloud/actograph-cloud.service.ts`
- `front/src/pages/userspace/home/` (composants Cloud)

**Tâches** :
- [ ] Ouvrir le sélecteur de fichier directement dans le dossier des chroniques Actograph
- [ ] Ou proposer une liste des chroniques locales à envoyer

---

### 0.8 Cloud - Import ancienne chronique : erreur 401 [P1] [BUG] ❌
**Constat** (Script 0.1) : L'import d'une ancienne chronique affiche "erreur status code 401".
**Fichiers concernés** :
- `front/src/services/cloud/actograph-cloud.service.ts`
- `front/src/composables/use-cloud/index.ts`
- `api/src/` (endpoint cloud si côté API)

**Tâches** :
- [ ] Investiguer l'erreur 401 (problème d'authentification/token expiré)
- [ ] Vérifier le flux d'authentification cloud
- [ ] Ajouter une gestion d'erreur explicite pour l'utilisateur

---

### 0.9 Lien ActoGraph.io incorrect [P3] [BUG] ❌
**Constat** : Le lien vers le site devrait pointer vers `https://www.actograph.io/web/fr/software/tutorial` et non vers la page générale.
**Fichiers concernés** :
- `front/src/pages/userspace/home/Index.vue` ou composant de liens

**Tâches** :
- [ ] Mettre à jour l'URL du lien vers la page tutorial
- [ ] Vérifier que le lien s'ouvre dans un navigateur externe (mode Electron)

---

### 0.10 Import chronique (Script 0.2) - Erreurs d'affichage [P1] [BUG] ❌
**Constat** : Après import d'une chronique exportée :
- Onglet Accueil : mentions "! Failed to load…" et "! No data available"
- Onglet Graph : volet droit visible mais zone du graph vide

**Fichiers concernés** :
- `front/src/services/observations/import.service.ts`
- `front/src/composables/use-observation/` (useProtocol, useReadings)
- `front/src/pages/userspace/analyse/Index.vue`

**Tâches** :
- [ ] Reproduire le bug d'import (exporter puis réimporter une chronique)
- [ ] Vérifier le parsing des données importées (protocole, relevés, graph)
- [ ] Corriger le chargement du graphe après import
- [ ] Corriger les messages d'erreur sur l'onglet Accueil

---

### 0.11 Aide interactive résidente et/ou en ligne [P4] [FEATURE] ❌
**Constat** : La fonction d'aide interactive (résidente ou en ligne) n'existe pas encore.
**Fichiers concernés** :
- `front/src/pages/userspace/home/Index.vue`

**Tâches** :
- [ ] Définir le contenu et le format de l'aide (modale, page dédiée, lien externe ?)
- [ ] Implémenter l'accès à l'aide depuis la page d'accueil

---

### 0.12 Préférences utilisateur [P4] [FEATURE] ❌
**Constat** : Le menu préférences n'est pas encore implémenté.
**Fichiers concernés** :
- `front/src/pages/userspace/` (nouvelle page ou modale)

**Tâches** :
- [ ] Définir les préférences configurables (affichage, langue, thème...)
- [ ] Créer l'interface de préférences
- [ ] Persister les préférences (localStorage ou API)

---

### 0.13 Fusionner 2 chroniques [P4] [FEATURE] ❌
**Constat** : La fonction de fusion de deux chroniques n'existe pas encore.
**Fichiers concernés** :
- `front/src/services/observations/` (nouveau service)
- `front/src/pages/userspace/home/`

**Tâches** :
- [ ] Concevoir l'algorithme de fusion (résolution de conflits, combinaison des relevés)
- [ ] Créer l'interface de sélection des chroniques à fusionner
- [ ] Implémenter la fusion et les tests

---

## Chapitre 1 - Protocole

### 1.1 Changement de type de catégorie met le protocole en erreur persistante [P1] [BUG] ❌
**Constat** (Script 1.1) : Changer une catégorie continue en "discret" ne fonctionne pas ET ensuite bloque toute modification ultérieure du protocole. Même revenir au mode "continu" échoue. Sur le graph, les couleurs ne peuvent plus être changées. La tuile historique affiche "no data available" et la chronique Exemple ne peut plus être chargée.

> **Note** : Ce bug est lié à la tâche 3.6 (type événement non modifiable sur le graphe).
> Les deux doivent être traités ensemble.

**Fichiers concernés** :
- `front/src/pages/userspace/protocol/Index.vue` et ses `_components/`
- `front/src/composables/use-observation/use-protocol.ts`
- `front/src/services/observations/protocol.service.ts`
- `api/src/core/observations/services/protocol/index.service.ts`
- `api/src/core/observations/entities/protocol.entity.ts`

**Tâches** :
- [ ] Reproduire le bug de changement de type de catégorie
- [ ] Identifier pourquoi le changement continu → discret/événement échoue
- [ ] Corriger la gestion d'erreur pour ne pas bloquer le protocole en état d'erreur persistant
- [ ] S'assurer que le rollback fonctionne (revenir au type précédent)
- [ ] Vérifier l'impact sur le graph et les couleurs après changement de type
- [ ] Vérifier l'impact sur l'historique et le chargement des chroniques
- [ ] Permettre le changement de type après création (continu ↔ événement ↔ frise ↔ arrière-plan)

---

### 1.2 Caractériser les catégories - fonction manquante [P3] [FEATURE] ❌
**Constat** : La fonction "caractériser" une catégorie (au-delà du nom et type) n'existe pas encore.
**Fichiers concernés** :
- `front/src/pages/userspace/protocol/` (composants de catégorie)
- `api/src/core/observations/entities/protocol.entity.ts`

**Tâches** :
- [ ] Définir les attributs de caractérisation nécessaires (à confirmer avec Valérie)
- [ ] Implémenter l'interface de caractérisation des catégories

---

### 1.3 Caractériser les observables - fonction manquante [P3] [FEATURE] ❌
**Constat** : La fonction "caractériser" un observable n'existe pas encore.
**Fichiers concernés** :
- `front/src/pages/userspace/protocol/` (composants d'observable)
- `api/src/core/observations/entities/protocol.entity.ts`

**Tâches** :
- [ ] Définir les attributs de caractérisation nécessaires (à confirmer avec Valérie)
- [ ] Implémenter l'interface de caractérisation des observables

---

### 1.4 Dupliquer une catégorie / déplacer vers une autre catégorie [P4] [FEATURE] ❌
**Constat** (Bonus) : Valérie mentionne le souhait de pouvoir dupliquer une catégorie et déplacer des observables dans une boîte ou vers une autre catégorie.
**Fichiers concernés** :
- `front/src/pages/userspace/protocol/`
- `front/src/composables/use-observation/use-protocol.ts`

**Tâches** :
- [ ] Implémenter la duplication d'une catégorie (avec ses observables)
- [ ] Implémenter le déplacement d'observables entre catégories

---

## Chapitre 2 - Observations (In Situ + Vidéo - Composants partagés)

> **Note importante** : Les tâches ci-dessous concernent des composants **partagés** entre le mode
> in situ et le mode vidéo. Elles sont regroupées ici pour éviter les doublons et les conflits
> de fichiers entre agents.

### 2.1 Boutons observables actifs pas assez visibles [P2] [UX] ❌
**Constat** : Aussi bien en mode continu qu'événement, aussi bien en in situ qu'en vidéo, le bouton actif (ON) n'est pas assez visible. L'utilisateur ne distingue pas clairement l'état actif.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` et `_components/` (composant bouton partagé)
- `front/src/css/` (styles des boutons)

**Tâches** :
- [ ] Identifier le composant de bouton observable (partagé in situ/vidéo)
- [ ] Améliorer le contraste visuel entre état actif et inactif
- [ ] Ajouter un indicateur visuel fort (couleur de fond, bordure, animation)
- [ ] Tester en mode continu ET événement, en in situ ET vidéo

---

### 2.2 Réorganisation des boutons : catégorie inaccessible [P1] [BUG] ❌
**Constat** : Dès qu'on déplace une catégorie pour réorganiser, elle va se loger tout à gauche et devient inaccessible.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/Index.vue` et `_components/`
- Composants de drag & drop des catégories

**Tâches** :
- [ ] Reproduire le bug de déplacement de catégorie
- [ ] Identifier le mécanisme de positionnement (CSS / JS)
- [ ] Corriger le calcul de position après drag & drop
- [ ] Vérifier les limites de la zone de drop

---

### 2.3 Impossible de cliquer sur les boutons sans enregistrement [P2] [BUG] ❌
**Constat** : Sans lancer l'enregistrement, on ne peut pas agir sur les boutons. L'utilisateur a besoin de :
- Tester les boutons pour comprendre le fonctionnement
- Positionner l'état par défaut AVANT de lancer l'enregistrement

**Comportement attendu** : Le clic sans enregistrement change l'état visuel du bouton (ON/OFF) mais ne crée pas de relevé horodaté.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/composables/use-observation/use-readings.ts`

**Tâches** :
- [ ] Permettre le clic sur les boutons observables en dehors de l'enregistrement (mode "test")
- [ ] Le clic sans enregistrement change l'état visuel mais ne crée pas de relevé
- [ ] S'applique à la fois au mode in situ et vidéo

---

### 2.4 Impossible de cliquer sur les boutons en pause [P1] [BUG] ❌
**Constat** : Après le démarrage, on ne peut pas se mettre en pause pour cliquer tranquillement. En mode vidéo, c'est particulièrement important car on s'arrête souvent pour observer.

**Comportement attendu** :
- **In situ** : Le clic en pause devrait être possible. À confirmer avec Valérie si cela crée un relevé horodaté ou non.
- **Vidéo** : Le clic en pause DOIT créer un relevé horodaté basé sur le timestamp de la vidéo (pas du chronomètre). C'est le workflow principal en mode vidéo.

**Fichiers concernés** :
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/composables/use-observation/use-readings.ts`

**Tâches** :
- [ ] Permettre le clic sur les boutons observables pendant la pause (in situ + vidéo)
- [ ] En mode vidéo : créer un relevé horodaté basé sur le timestamp vidéo
- [ ] En mode in situ : à confirmer avec Valérie (relevé ou simple changement d'état)

---

### 2.5 Différencier "supprimer une ligne" et "effacer la liste" [P3] [UX] ❌
**Constat** : Il faut mieux différencier visuellement et fonctionnellement la suppression d'une seule ligne vs l'effacement complet de la liste. Concerne les deux modes (in situ et vidéo).
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant tableau des relevés, partagé)

**Tâches** :
- [ ] Séparer clairement les actions "supprimer une ligne" et "effacer tout"
- [ ] Ajouter une confirmation pour "effacer tout"
- [ ] Utiliser des icônes/labels différents

---

### 2.6 Erreurs "Observable non reconnu" non signalées [P2] [BUG] ❌
**Constat** : Les erreurs d'observable non reconnu ne sont pas visibles dans la liste des relevés. Elles devraient apparaître en rouge. Concerne les deux modes (in situ et vidéo).
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant tableau des relevés, partagé)

**Tâches** :
- [ ] Ajouter une validation des observables dans la liste des relevés
- [ ] Afficher les lignes avec des observables non reconnus en rouge
- [ ] Ajouter un message d'erreur explicite

---

### 2.7 Bouton Commentaire BULLE [P3] [FEATURE] ❌
**Constat** : La fonctionnalité de commentaire horodaté (bulle) serait utile à implémenter.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/composables/use-observation/use-readings.ts`

**Tâches** :
- [ ] Ajouter un bouton "Commentaire" dans l'interface d'observation
- [ ] Ouvrir une fenêtre de saisie de texte au clic
- [ ] Créer un relevé de type "commentaire" horodaté dans la liste

---

### 2.8 Sélection d'observable via menu déroulant [P3] [FEATURE] ❌
**Constat** : Dans la liste des relevés, la saisie/modification d'un observable devrait pouvoir se faire via un menu déroulant. Les catégories en couleur et les observables en noir pour une meilleure lisibilité. Fonction à créer. Concerne les deux modes (in situ et vidéo).
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant tableau des relevés, partagé)

**Tâches** :
- [ ] Créer un composant de sélection d'observable avec dropdown
- [ ] Afficher les catégories en couleur et les observables en noir
- [ ] Permettre la saisie directe au clavier en alternative
- [ ] Intégrer dans le tableau des relevés (in situ et vidéo)

---

### 2.9 Rechercher/Remplacer dans les relevés [P4] [FEATURE] ❌
**Constat** : Fonction de recherche et remplacement dans la liste des relevés à créer. Concerne les deux modes.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant tableau des relevés, partagé)

**Tâches** :
- [ ] Créer une interface de recherche/remplacement
- [ ] Implémenter la recherche sur les labels/observables
- [ ] Implémenter le remplacement avec prévisualisation

---

## Chapitre 2bis - Observations Vidéo (Spécifique)

> **Note** : Cette section ne contient que les bugs/features **spécifiques** au mode vidéo.
> Les composants partagés (boutons, tableau des relevés, etc.) sont dans le Chapitre 2.

### 2b.1 Premiers relevés commencent en négatif (-2ms) [P2] [BUG] ❌
**Constat** : Les premiers relevés en mode vidéo commencent avec un horodatage négatif (-2ms). Valérie note "pas indispensable à ce stade".
**Fichiers concernés** :
- `front/src/composables/use-observation/use-readings.ts`
- `front/src/pages/userspace/observation/` (mode vidéo)

**Tâches** :
- [ ] Identifier l'origine du décalage temporel négatif
- [ ] Corriger l'initialisation du chronomètre/timestamp en mode vidéo
- [ ] S'assurer que le premier relevé commence à 0ms ou positif

---

### 2b.2 Le mode pause ne devrait pas être enregistré [P2] [BUG] ❌
**Constat** : En mode vidéo, les pauses sont fréquentes (workflow normal). Le mode pause ne devrait pas être enregistré dans la liste des relevés.
**Fichiers concernés** :
- `front/src/composables/use-observation/use-readings.ts`

**Tâches** :
- [ ] Vérifier ce qui est enregistré lors d'une pause en mode vidéo
- [ ] Ne pas enregistrer les événements PAUSE dans la liste des relevés en mode vidéo
- [ ] Ou ajouter une option pour les filtrer

---

### 2b.3 Édition horodatage : mauvais timestamp et modification non prise en compte [P1] [BUG] ❌
**Constat** : En mode vidéo, quand on édite l'horodatage d'un relevé, la boîte de dialogue qui s'ouvre affiche le timestamp d'une autre ligne. Et la modification ne prend pas.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant édition de relevé)
- `front/src/composables/use-observation/use-readings.ts`

**Tâches** :
- [ ] Identifier le bug de correspondance entre la ligne sélectionnée et le dialog d'édition
- [ ] Corriger le passage de l'ID/index du relevé au dialog
- [ ] Corriger la sauvegarde de la modification d'horodatage
- [ ] Tester en mode vidéo spécifiquement

---

### 2b.4 Copier-coller ne fonctionne que pour les libellés [P3] [BUG] ❌
**Constat** : En mode vidéo, le copier-coller ne fonctionne que pour les libellés et pas pour les autres champs (horodatage, etc.).
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (composant tableau des relevés)

**Tâches** :
- [ ] Identifier les champs qui ne supportent pas le copier-coller
- [ ] Étendre le copier-coller à tous les champs éditables

---

### 2b.5 Récupérer/copier un protocole existant [P3] [FEATURE] ❌
**Constat** : La fonction pour récupérer ou copier un protocole existant lors de la création d'une chronique vidéo n'existe pas encore. L'activation du protocole à la création de la chronique est aussi mentionnée.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/` (mode vidéo)
- `front/src/services/observations/protocol.service.ts`

**Tâches** :
- [ ] Ajouter une option "copier un protocole existant" lors de la création d'une chronique vidéo
- [ ] Implémenter le listing et la sélection de protocoles existants
- [ ] Dupliquer le protocole sélectionné dans la nouvelle chronique
- [ ] Activer automatiquement le protocole à la création

---

### 2b.6 Détacher les fenêtres Vidéo et boutons [P4] [FEATURE] ❌
**Constat** : Possibilité de détacher les fenêtres Vidéo et Boutons serait très utile.
**Fichiers concernés** :
- `front/src/pages/userspace/observation/Index.vue`

**Tâches** :
- [ ] Évaluer la faisabilité technique (fenêtres flottantes ou détachables)
- [ ] Implémenter si faisable dans le contexte Electron

---

## Chapitre 3 - Chronique d'activité (Graphe)

### 3.1 Première catégorie invisible à partir de 4 catégories [P1] [BUG] ❌
**Constat** : À partir de 4 catégories, la première catégorie n'est pas visible sur le graphe (problème d'axe des ordonnées).
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/Index.vue` et `_components/`
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Reproduire le bug avec 4+ catégories
- [ ] Identifier le problème de calcul de l'axe Y ou de la zone de dessin (amCharts)
- [ ] Corriger pour afficher toutes les catégories quel que soit leur nombre

---

### 3.2 Changement vers mode Frise échoue [P1] [BUG] ❌
**Constat** : Le changement de mode d'affichage vers "Frise" ne prend pas. Message : "Erreur lors de la mise à jour des préférences". Le mode Frise ne peut pas être choisi.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (panel de préférences)
- `front/src/services/observations/activity-graph.service.ts`
- `api/src/core/observations/services/activity-graph.service.ts`
- `api/src/core/observations/entities/activity-graph.entity.ts`

**Tâches** :
- [ ] Reproduire l'erreur de changement vers mode Frise
- [ ] Vérifier l'endpoint API de mise à jour des préférences (DTO, validation)
- [ ] Corriger le bug de mise à jour du mode d'affichage
- [ ] S'assurer que Frise, État continu et Arrière-plan fonctionnent tous

---

### 3.3 Plage temporelle incorrecte [P2] [BUG] ❌
**Constat** : La plage de l'axe des abscisses n'est pas toujours correcte.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (composant graphe)
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Identifier les cas où la plage est incorrecte
- [ ] Corriger le calcul des bornes min/max de l'axe des abscisses
- [ ] Vérifier les arrondis horaires (ex: si START à 6h06, abscisse à 6h00)

---

### 3.4 Affichage ne se rafraîchit pas après modification d'horodatage [P2] [BUG] ❌
**Constat** : Le graphe ne se réactualise pas quand on change l'horodatage des relevés dans l'onglet Observations.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/Index.vue`
- `front/src/composables/use-observation/` (watch/reactivity)

**Tâches** :
- [ ] Ajouter un mécanisme de réactivité entre les relevés et le graphe
- [ ] Déclencher un rafraîchissement du graphe après modification d'un relevé
- [ ] Vérifier que la réactivité fonctionne dans les deux sens

---

### 3.5 Mode Arrière-plan ne fonctionne pas correctement [P2] [BUG] ❌
**Constat** : Le mode arrière-plan est inopérant. Il devrait demander "arrière-plan de quelle catégorie ?" pour savoir quelle catégorie afficher en arrière-plan.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (panel de préférences)
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Ajouter un sélecteur de catégorie pour le mode arrière-plan
- [ ] Implémenter l'affichage en arrière-plan de la catégorie sélectionnée
- [ ] Tester avec différentes combinaisons de catégories

---

### 3.6 Type événement ne peut être changé après définition initiale [P2] [BUG] ❌
**Constat** : Le type événement ne fonctionne que s'il est défini au début dans le protocole. Il ne peut pas être changé après.

> **Note** : Ce bug est lié à la tâche 1.1 (changement de type de catégorie).
> La correction de 1.1 devrait résoudre ce problème. Le graphe doit supporter les changements de type a posteriori.

**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (rendu graphe selon le type)
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Vérifier que le graphe gère correctement un changement de type après la correction de 1.1
- [ ] Mettre à jour le rendu du graphe après changement de type
- [ ] Gérer la conversion des données existantes si nécessaire

---

### 3.7 Couleurs ne persistent pas (Script 3.1) [P1] [BUG] ❌
**Constat** : Les changements de couleurs prennent temporairement mais ne restent pas. Quand on change à nouveau, elles redeviennent vertes. Le changement de couleur prend sur les Observables mais pas sur la catégorie. Si on change une couleur d'observable, les autres reviennent au vert.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (panel couleurs)
- `front/src/services/observations/activity-graph.service.ts`
- `api/src/core/observations/services/activity-graph.service.ts`
- `api/src/core/observations/entities/activity-graph.entity.ts`

**Tâches** :
- [ ] Reproduire le bug de persistance des couleurs
- [ ] Vérifier la sauvegarde des couleurs côté API (entity, service, DTO)
- [ ] Corriger la logique de mise à jour des couleurs (par observable ET par catégorie)
- [ ] S'assurer que changer une couleur ne réinitialise pas les autres

---

### 3.8 Axes disparaissent lors de modification du start (Script 3.2) [P2] [BUG] ❌
**Constat** : Avec un start à 15h59, le graph s'affiche normalement. En modifiant le start à 01h59, les axes X et Y disparaissent (même si le graphique s'ajuste en se tassant à droite). En remettant 15h59, les axes se réaffichent.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (composant graphe, amCharts)
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Reproduire le bug avec un changement de start (15h59 → 01h59)
- [ ] Identifier le problème de rendu des axes (calcul de plage ou rendu amCharts)
- [ ] Corriger le rendu des axes pour toute plage temporelle valide

---

### 3.9 Affichage échelle en diagonale - formats temporels [P3] [FEATURE] ❌
**Constat** : L'affichage de l'échelle de l'axe X avec des formats temporels variables (JJ.MM.AAAA hh:mn:sec:ms, JJ.MM.AAAA, hh.mn, hh.mn.sec, mn.sec, mn.sec.ms) n'est pas fonctionnel.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/` (composant graphe, amCharts)
- `front/src/services/observations/activity-graph.service.ts`

**Tâches** :
- [ ] Implémenter le formatage adaptatif de l'axe X selon la durée totale
- [ ] Afficher en diagonale pour la lisibilité
- [ ] Proposer les formats appropriés : date+heure si > 24h, heure:min si > 1h, min:sec si < 1h, etc.

---

### 3.10 Export graphe (JPEG, PNG, légende) [P3] [FEATURE] ❌
**Constat** : Les fonctions d'export du graphe en JPEG, PNG, et export séparé de la légende sont à créer.
**Fichiers concernés** :
- `front/src/pages/userspace/analyse/Index.vue`
- `front/src/services/observations/export.service.ts`

**Tâches** :
- [ ] Implémenter l'export du graphe en JPEG (via amCharts exporting)
- [ ] Implémenter l'export du graphe en PNG (compatibilité PowerPoint)
- [ ] Implémenter l'export séparé de la légende des couleurs
- [ ] Ajouter les boutons d'export dans l'interface

---

### 3.11 Ordre d'affichage des ordonnées non paramétrable [P3] [FEATURE] ❌
**Constat** : L'ordre d'affichage des catégories sur l'axe Y n'est pas paramétrable. La fonction de changement de l'ordre dans le Protocole reste à créer.

> **Note** : Cette tâche touche à la fois le protocole (Agent B) et le graphe (Agent D).
> La partie "réordonnancement dans le protocole" relève de l'Agent B (1.4 bonus).
> La partie "rendu de l'ordre dans le graphe" relève de l'Agent D.
> À exécuter après que B ait implémenté la persistance de l'ordre.

**Fichiers concernés** :
- `front/src/pages/userspace/protocol/` (réordonnancement → Agent B)
- `front/src/pages/userspace/analyse/` (utilisation de l'ordre → Agent D)

**Tâches** :
- [ ] [Agent B] Ajouter un mécanisme de réordonnancement des catégories dans le protocole (drag & drop)
- [ ] [Agent B] Persister l'ordre dans les données du protocole
- [ ] [Agent D] Lire l'ordre depuis le protocole et l'appliquer dans le graphe

---

## Chapitre 4 - Statistiques

### 4.1 Totaux incorrects avec relevés vidéo [P2] [BUG] ❌
**Constat** : Dans "Statistiques par catégorie", les totaux ne semblent pas bons lorsque les données proviennent d'un relevé vidéo.
**Fichiers concernés** :
- `front/src/composables/use-statistics/index.ts`
- `front/src/services/observations/statistics.service.ts`
- `api/src/core/observations/services/statistics.service.ts`

**Tâches** :
- [ ] Reproduire le bug avec des données de relevé vidéo
- [ ] Vérifier le calcul des durées et occurrences en mode vidéo
- [ ] Comparer avec les calculs en mode in situ
- [ ] Corriger les écarts de calcul

---

### 4.2 Statistiques combinées : observables de la catégorie étudiée dans le menu [P2] [BUG] ❌
**Constat** : Dans le menu [+ ajouter une condition] des diagrammes combinés, les observables de la "catégorie à étudier" choisie au-dessus ne devraient pas figurer (pour éviter de combiner une catégorie avec elle-même).
**Fichiers concernés** :
- `front/src/pages/userspace/statistics/Index.vue` et `_components/`
- `front/src/composables/use-statistics/index.ts`

**Tâches** :
- [ ] Filtrer les observables de la catégorie sélectionnée dans le menu "ajouter condition"
- [ ] Mettre à jour dynamiquement le filtre quand la catégorie change

---

## Questions ouvertes / Points de discussion avec Valérie

Ces points ne sont pas des bugs mais des questions soulevées par Valérie qui méritent une réponse ou une décision :

1. **Licensing / Open source** : "Quelle place à l'Open source ? Ne serait-ce pas le lieu pour expliquer l'articulation Licence privée – Open source du code ?" → Décision à prendre sur la communication licensing dans l'interface.

2. **Changement de licence** : "Comment passer d'une licence à une autre ? Un étudiant qui achète la licence est-il obligé de désinstaller/réinstaller ? Ça le conduit à devoir sauvegarder toutes ses chroniques ?" → Workflow de migration de licence à concevoir.

3. **Après une Pause, on remet un START ?** : Valérie s'interroge sur le comportement de reprise après pause. → Clarifier si la reprise après pause crée une entrée START dans la liste des relevés.

4. **Saisie directe dans le tableau** (in situ) : Valérie note "NOK" sur la saisie directe inline, mais ajoute "finalement ça va comme ça ! la fenêtre de saisie est bien faite". → Pas d'action nécessaire, garder l'implémentation actuelle.

5. **CTRL+Z** : Fonctionne juste en cours de saisie. Valérie note "Mais ça peut suffire pour le moment". → Pas d'action immédiate, à revoir plus tard si besoin.

6. **Édition du protocole depuis l'onglet Observations** : NOK en in situ ("Mais dans l'immédiat, on peut se contenter de revenir à protocole") et en vidéo ("Pas indispensable à ce stade"). → Pas d'action immédiate, le workaround (retour à l'onglet Protocole) est acceptable.

7. **Enregistrement audio** (Bonus Chap 2) : Bouton Enrgt Audio mentionné dans le cahier des charges comme bonus futur. → Non implémenté, à planifier ultérieurement si besoin.

---

## Récapitulatif par priorité

### P1 - Critique (10 items)
| # | Zone | Titre | ID | Type |
|---|------|-------|----|------|
| 1 | Chap 0 | Save As impossible | 0.3 | BUG |
| 2 | Chap 0 | Cloud import : erreur 401 | 0.8 | BUG |
| 3 | Chap 0 | Import chronique : "Failed to load" + graph vide | 0.10 | BUG |
| 4 | Chap 1 | Changement type catégorie → erreur persistante | 1.1 | BUG |
| 5 | Chap 2 | Réorganisation boutons : catégorie inaccessible | 2.2 | BUG |
| 6 | Chap 2 | Clic en pause ne fonctionne pas (in situ + vidéo) | 2.4 | BUG |
| 7 | Chap 2b | Édition horodatage vidéo : mauvais timestamp | 2b.3 | BUG |
| 8 | Chap 3 | Première catégorie invisible (4+ catégories) | 3.1 | BUG |
| 9 | Chap 3 | Changement vers Frise échoue | 3.2 | BUG |
| 10 | Chap 3 | Couleurs ne persistent pas | 3.7 | BUG |

### P2 - Haute (17 items)
| # | Zone | Titre | ID | Type |
|---|------|-------|----|------|
| 11 | Chap 0 | Identifiant tronqué | 0.1 | BUG |
| 12 | Chap 0 | Fenêtre blanche bloquante | 0.4 | BUG |
| 13 | Chap 0 | Dossier par défaut inconnu | 0.5 | BUG |
| 14 | Chap 0 | Date modification incorrecte | 0.6 | BUG |
| 15 | Chap 0 | Cloud : chroniques introuvables | 0.7 | BUG |
| 16 | Chap 2 | Boutons actifs pas assez visibles | 2.1 | UX |
| 17 | Chap 2 | Clic sans enregistrement impossible | 2.3 | BUG |
| 18 | Chap 2 | Erreurs observable non signalées | 2.6 | BUG |
| 19 | Chap 2b | Horodatage négatif (-2ms) | 2b.1 | BUG |
| 20 | Chap 2b | Mode pause enregistré | 2b.2 | BUG |
| 21 | Chap 3 | Plage temporelle incorrecte | 3.3 | BUG |
| 22 | Chap 3 | Graphe ne se rafraîchit pas | 3.4 | BUG |
| 23 | Chap 3 | Mode arrière-plan défaillant | 3.5 | BUG |
| 24 | Chap 3 | Type événement non modifiable | 3.6 | BUG |
| 25 | Chap 3 | Axes disparaissent (Script 3.2) | 3.8 | BUG |
| 26 | Chap 4 | Totaux incorrects (vidéo) | 4.1 | BUG |
| 27 | Chap 4 | Filtre observables combinés | 4.2 | BUG |

### P3 - Moyenne (12 items)
| # | Zone | Titre | ID | Type |
|---|------|-------|----|------|
| 28 | Chap 0 | Langue FR non indiquée | 0.2 | UX |
| 29 | Chap 0 | Lien ActoGraph.io incorrect | 0.9 | BUG |
| 30 | Chap 1 | Caractériser catégories | 1.2 | FEATURE |
| 31 | Chap 1 | Caractériser observables | 1.3 | FEATURE |
| 32 | Chap 2 | Différencier supprimer/effacer | 2.5 | UX |
| 33 | Chap 2 | Bouton Commentaire BULLE | 2.7 | FEATURE |
| 34 | Chap 2 | Sélection observable déroulant | 2.8 | FEATURE |
| 35 | Chap 2b | Copier-coller limité aux libellés | 2b.4 | BUG |
| 36 | Chap 2b | Copier protocole existant | 2b.5 | FEATURE |
| 37 | Chap 3 | Affichage échelle formats temporels | 3.9 | FEATURE |
| 38 | Chap 3 | Export graphe (JPEG/PNG/légende) | 3.10 | FEATURE |
| 39 | Chap 3 | Ordre ordonnées paramétrable | 3.11 | FEATURE |

### P4 - Basse (6 items)
| # | Zone | Titre | ID | Type |
|---|------|-------|----|------|
| 40 | Chap 0 | Aide interactive | 0.11 | FEATURE |
| 41 | Chap 0 | Préférences utilisateur | 0.12 | FEATURE |
| 42 | Chap 0 | Fusionner 2 chroniques | 0.13 | FEATURE |
| 43 | Chap 1 | Dupliquer/déplacer catégorie | 1.4 | FEATURE |
| 44 | Chap 2 | Rechercher/Remplacer relevés | 2.9 | FEATURE |
| 45 | Chap 2b | Détacher fenêtres vidéo | 2b.6 | FEATURE |

**Total : 45 items** (10 P1 + 17 P2 + 12 P3 + 6 P4) dont 28 BUG, 14 FEATURE, 3 UX

---

## Matrice de tâches multi-agents

Cette matrice est conçue pour être utilisée en mode multi-agents. Chaque agent travaille sur un domaine indépendant avec un périmètre de fichiers distinct pour éviter les conflits.

### Agent A — Page d'accueil & Gestion fichiers (Chap 0)
**Scope** : Toutes les corrections liées à la page d'accueil, la gestion des chroniques, le cloud, et l'autosave.
**Fichiers principaux** :
- `front/src/pages/userspace/home/`
- `front/src/composables/use-autosave/`
- `front/src/composables/use-cloud/`
- `front/src/services/observations/autosave.service.ts`
- `front/src/services/observations/import.service.ts`
- `front/src/services/cloud/`
- `front/src/components/autosave-file-picker/`
- `front/src/pages/userspace/_components/drawer/`

| # | Tâche | ID | Priorité | Type | Statut |
|---|-------|----|----------|------|--------|
| 1 | Save As impossible | 0.3 | P1 | BUG | [ ] |
| 2 | Cloud : erreur 401 import ancienne chronique | 0.8 | P1 | BUG | [ ] |
| 3 | Import : erreurs "Failed to load" + graph vide | 0.10 | P1 | BUG | [ ] |
| 4 | Identifiant utilisateur tronqué | 0.1 | P2 | BUG | [ ] |
| 5 | Fenêtre blanche bloquante au chargement | 0.4 | P2 | BUG | [ ] |
| 6 | Dossier par défaut inconnu | 0.5 | P2 | BUG | [ ] |
| 7 | Date modification incorrecte historique | 0.6 | P2 | BUG | [ ] |
| 8 | Cloud : chroniques introuvables à l'envoi | 0.7 | P2 | BUG | [ ] |
| 9 | Langue FR non indiquée | 0.2 | P3 | UX | [ ] |
| 10 | Lien ActoGraph.io vers tutorial | 0.9 | P3 | BUG | [ ] |
| 11 | Aide interactive | 0.11 | P4 | FEATURE | [ ] |
| 12 | Préférences utilisateur | 0.12 | P4 | FEATURE | [ ] |
| 13 | Fusionner 2 chroniques | 0.13 | P4 | FEATURE | [ ] |

---

### Agent B — Protocole & Changement de type (Chap 1 + lien 3.6)
**Scope** : Corrections du protocole, changement de type de catégorie, caractérisation. Inclut aussi la tâche 3.6 (type événement non modifiable) car c'est le même problème que 1.1.
**Fichiers principaux** :
- `front/src/pages/userspace/protocol/` (tous les composants)
- `front/src/composables/use-observation/use-protocol.ts`
- `front/src/services/observations/protocol.service.ts`
- `api/src/core/observations/services/protocol/`
- `api/src/core/observations/entities/protocol.entity.ts`

| # | Tâche | ID | Priorité | Type | Statut |
|---|-------|----|----------|------|--------|
| 1 | Changement type catégorie → erreur persistante | 1.1 | P1 | BUG | [ ] |
| 2 | Type événement non modifiable (depuis graphe) | 3.6 | P2 | BUG | [ ] |
| 3 | Caractériser catégories (fonction manquante) | 1.2 | P3 | FEATURE | [ ] |
| 4 | Caractériser observables (fonction manquante) | 1.3 | P3 | FEATURE | [ ] |
| 5 | Dupliquer/déplacer catégorie | 1.4 | P4 | FEATURE | [ ] |

---

### Agent C — Observations : composants partagés + In Situ + Vidéo (Chap 2 + 2bis)
**Scope** : Toutes les corrections d'observation, regroupant in situ et vidéo pour éviter les conflits sur les fichiers partagés (`use-readings.ts`, composants boutons, tableau des relevés).
**Fichiers principaux** :
- `front/src/pages/userspace/observation/` (tous composants in situ ET vidéo)
- `front/src/composables/use-observation/use-readings.ts`
- `front/src/composables/use-observation/use-protocol.ts`
- `front/src/services/observations/reading.service.ts`
- `front/src/css/` (styles boutons)

| # | Tâche | ID | Priorité | Type | Mode | Statut |
|---|-------|----|----------|------|------|--------|
| 1 | Réorganisation boutons : catégorie inaccessible | 2.2 | P1 | BUG | Partagé | [ ] |
| 2 | Clic en pause ne fonctionne pas | 2.4 | P1 | BUG | Partagé | [ ] |
| 3 | Édition horodatage vidéo : mauvais timestamp | 2b.3 | P1 | BUG | Vidéo | [ ] |
| 4 | Boutons actifs pas assez visibles | 2.1 | P2 | UX | Partagé | [ ] |
| 5 | Clic sans enregistrement impossible | 2.3 | P2 | BUG | Partagé | [ ] |
| 6 | Erreurs observable non signalées en rouge | 2.6 | P2 | BUG | Partagé | [ ] |
| 7 | Horodatage négatif (-2ms) | 2b.1 | P2 | BUG | Vidéo | [ ] |
| 8 | Mode pause enregistré (ne devrait pas) | 2b.2 | P2 | BUG | Vidéo | [ ] |
| 9 | Différencier supprimer ligne / effacer liste | 2.5 | P3 | UX | Partagé | [ ] |
| 10 | Bouton Commentaire BULLE | 2.7 | P3 | FEATURE | Partagé | [ ] |
| 11 | Sélection observable via déroulant | 2.8 | P3 | FEATURE | Partagé | [ ] |
| 12 | Copier-coller limité aux libellés (vidéo) | 2b.4 | P3 | BUG | Vidéo | [ ] |
| 13 | Copier protocole existant (vidéo) | 2b.5 | P3 | FEATURE | Vidéo | [ ] |
| 14 | Rechercher/Remplacer dans relevés | 2.9 | P4 | FEATURE | Partagé | [ ] |
| 15 | Détacher fenêtres vidéo/boutons | 2b.6 | P4 | FEATURE | Vidéo | [ ] |

---

### Agent D — Graphe / Chronique d'activité (Chap 3, hors 3.6)
**Scope** : Toutes les corrections liées au graphe, couleurs, axes, modes d'affichage, export. La tâche 3.6 est déportée vers Agent B (protocole) car liée à 1.1.
**Fichiers principaux** :
- `front/src/pages/userspace/analyse/` (tous les composants)
- `front/src/services/observations/activity-graph.service.ts`
- `front/src/services/observations/export.service.ts`
- `api/src/core/observations/services/activity-graph.service.ts`
- `api/src/core/observations/entities/activity-graph.entity.ts`

| # | Tâche | ID | Priorité | Type | Statut |
|---|-------|----|----------|------|--------|
| 1 | Première catégorie invisible (4+ catégories) | 3.1 | P1 | BUG | [ ] |
| 2 | Changement vers Frise échoue | 3.2 | P1 | BUG | [ ] |
| 3 | Couleurs ne persistent pas (Script 3.1) | 3.7 | P1 | BUG | [ ] |
| 4 | Plage temporelle incorrecte | 3.3 | P2 | BUG | [ ] |
| 5 | Graphe ne se rafraîchit pas après modif horodatage | 3.4 | P2 | BUG | [ ] |
| 6 | Mode arrière-plan défaillant | 3.5 | P2 | BUG | [ ] |
| 7 | Axes disparaissent (Script 3.2) | 3.8 | P2 | BUG | [ ] |
| 8 | Affichage échelle formats temporels | 3.9 | P3 | FEATURE | [ ] |
| 9 | Export graphe JPEG/PNG/légende | 3.10 | P3 | FEATURE | [ ] |
| 10 | Ordre ordonnées paramétrable | 3.11 | P3 | FEATURE | [ ] |

---

### Agent E — Statistiques (Chap 4)
**Scope** : Corrections des statistiques et diagrammes combinés.
**Fichiers principaux** :
- `front/src/pages/userspace/statistics/` (tous les composants)
- `front/src/composables/use-statistics/index.ts`
- `front/src/services/observations/statistics.service.ts`
- `api/src/core/observations/services/statistics.service.ts`

| # | Tâche | ID | Priorité | Type | Statut |
|---|-------|----|----------|------|--------|
| 1 | Totaux incorrects avec relevés vidéo | 4.1 | P2 | BUG | [ ] |
| 2 | Filtre observables catégorie étudiée dans combinés | 4.2 | P2 | BUG | [ ] |

---

### Dépendances inter-agents

```
Agent B (Protocole) ──affects──► Agent C (Observations)
                    ──affects──► Agent D (Graphe)

Agent C (Observations) ──data──► Agent D (Graphe)
                       ──data──► Agent E (Statistiques)

Agent A (Accueil) ──indépendant──
```

### Recommandation d'exécution

> **Principe** : La plupart des bugs de chaque agent sont autonomes (pas de dépendance directe
> sur un autre agent). Les dépendances inter-agents concernent surtout les tâches P3/P4
> (caractérisation, réordonnancement, export). Les P1 et P2 peuvent être traités en parallèle.

| Phase | Agents en parallèle | Justification |
|-------|---------------------|---------------|
| **Phase 1 (P1+P2)** | **A** + **B** + **D** + **E** | Les bugs P1/P2 de chaque agent sont indépendants. Fichiers distincts, pas de conflits. |
| **Phase 2 (P1+P2)** | **C** | Observations traité après B (protocole) pour bénéficier des corrections de type de catégorie. |
| **Phase 3 (P3+P4)** | **Tous** | Features P3/P4 à traiter séquentiellement ou en coordination (3.11 nécessite B puis D). |

**Note** : En Phase 1, chaque agent se concentre sur ses tâches P1 puis P2.
Les tâches P3/P4 sont reportées en Phase 3 pour éviter les conflits sur les fichiers partagés (protocole notamment).

---

## Notes techniques

- **Framework graphe** : amCharts (boot file dans `front/src/boot/amcharts.ts`)
- **Mode vidéo** : Composants dans `front/src/pages/userspace/observation/`
- **Autosave** : Géré par `front/src/composables/use-autosave/index.ts`
- **Cloud** : Services dans `front/src/services/cloud/`
- **Protocole** : Données structurées dans `protocol.entity.ts`, service dans `protocol/index.service.ts`
- **Couleurs** : Stockées dans l'entité `activity-graph.entity.ts`
- **ValidationPipe** : Le backend utilise `whitelist: true` et `forbidNonWhitelisted: true` — vérifier que les DTOs sont bien à jour
- **Composants partagés in situ/vidéo** : Les boutons observables et le tableau des relevés sont des composants partagés. Ne pas les modifier dans des agents/branches parallèles.
