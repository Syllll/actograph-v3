# Processus d'implémentation de features

Ce document décrit le processus standardisé pour créer un plan d'implémentation détaillé à partir d'une issue GitHub.

## Objectif

Lorsqu'une commande du type "implémente la feature de ce lien {lien GitHub}" est donnée, suivre ce processus pour :
1. Créer la structure de documentation
2. Analyser l'issue GitHub
3. Analyser le code existant
4. Proposer un plan d'implémentation détaillé
5. Obtenir la validation de l'utilisateur

---

## Étapes du processus

### 1. Création de la structure de documentation

**Format du dossier** : `docs/features/{date}-phase-{number}-{name}/{issue-number}-{feature-name}.md`

**Format du fichier** : Un seul fichier `{issue-number}-{feature-name}.md` qui contient à la fois le plan d'implémentation et l'avancement avec des checkboxes.

**Organisation par phases** :
- Les features sont organisées par phases dans des dossiers `{date}-phase-{number}-{name}/`
- Exemple : `docs/features/2025-01-phase-1-fondations/4-page-accueil.md`
- Chaque feature = un seul fichier markdown qui combine plan + avancement

**Exemple** :
- Issue #4 sur la page d'accueil
- Phase : Phase 1 - Fondations
- Fichier : `docs/features/2025-01-phase-1-fondations/4-page-accueil.md`

**Commandes** :
```bash
# Créer le dossier de phase si nécessaire
mkdir -p docs/features/{date}-phase-{number}-{name}

# Créer le fichier de la feature
touch docs/features/{date}-phase-{number}-{name}/{issue-number}-{feature-name}.md
```

---

### 2. Analyse de l'issue GitHub

**Actions à effectuer** :
- Lire le contenu de l'issue GitHub (via le lien fourni)
- Extraire la description complète
- Identifier les besoins fonctionnels
- Noter les contraintes et restrictions mentionnées

**Informations à capturer** :
- Description complète de la feature
- Liste des fonctionnalités demandées
- Contraintes techniques ou de design
- Priorités si mentionnées
- Bonus/fonctionnalités futures

---

### 3. Analyse du code existant

**Recherches à effectuer** :

#### 3.1 Recherche de fonctionnalités existantes
- Chercher les composants/services déjà implémentés liés à la feature
- Identifier les patterns existants dans le codebase
- Vérifier les composables/services disponibles
- Examiner la structure des fichiers existants

#### 3.2 Vérification de l'état actuel
- Qu'est-ce qui existe déjà ?
- Qu'est-ce qui fonctionne déjà ?
- Quels sont les composants/services réutilisables ?
- Y a-t-il des fonctionnalités similaires déjà implémentées ?

**Outils à utiliser** :
- `codebase_search` : Recherche sémantique dans le code
- `grep` : Recherche de patterns spécifiques
- `read_file` : Lecture des fichiers pertinents
- `list_dir` : Exploration de la structure des dossiers

---

### 4. Création du plan d'implémentation

**Structure du document markdown** :

```markdown
# Issue #{number} - {Titre de la feature}

**Lien GitHub** : {lien vers l'issue}

> **⚠️ IMPORTANT : Restrictions d'implémentation**
> 
> {Liste des restrictions si applicable}

## Description

{Reformulation de l'issue GitHub avec le contexte du projet}

## État actuel du projet

### Ce qui existe déjà

{Liste détaillée avec ✅ pour ce qui est déjà implémenté}

### Ce qui manque

{Liste détaillée avec ❌ pour ce qui doit être créé}

## Plan d'implémentation

### Phase 1 : {Nom de la phase}

#### 1.1 {Sous-tâche}
**Fichiers à créer/modifier** :
- `chemin/vers/fichier`

**Tâches** :
- [ ] Tâche 1
- [ ] Tâche 2

### Phase 2 : {Nom de la phase}
...

## Structure des fichiers à créer/modifier

### Nouveaux fichiers
```
structure/des/fichiers
```

### Fichiers à modifier
```
structure/des/fichiers
```

## Priorités

### Priorité haute (MVP)
1. Phase X : ...
2. Phase Y : ...

### Priorité moyenne
3. Phase Z : ...

### Priorité basse (bonus)
4. Phase W : ...

## Notes techniques

{Notes sur les technologies, patterns, conventions à utiliser}
```

---

### 5. Ajustements selon les retours

**Points à vérifier avec l'utilisateur** :

1. **Restrictions** :
   - Y a-t-il des parties à exclure ? (ex: header, footer, sauvegarde)
   - Y a-t-il des contraintes spécifiques ?

2. **Fonctionnalités existantes** :
   - Vérifier ce qui existe déjà dans le code
   - Ne pas dupliquer ce qui fonctionne déjà
   - Adapter le plan en conséquence

3. **Priorités** :
   - Confirmer les priorités
   - Identifier ce qui peut être reporté

4. **Estimations** :
   - Retirer les estimations de temps si demandé
   - Se concentrer sur les tâches uniquement

**Actions à effectuer** :
- Mettre à jour le plan selon les retours
- Marquer clairement ce qui existe déjà (✅)
- Retirer les sections non pertinentes
- Ajuster les priorités

---

### 6. Création du commentaire GitHub

**Créer un fichier** : `docs/features/{issue-number}-{feature-name}/comment-github.md`

**Format** :
- Résumé concis du plan
- Checklist des tâches
- Organisation par priorités
- Liste des fichiers à créer/modifier
- Notes techniques essentielles

**Utilisation** :
- Ce fichier peut être copié-collé dans un commentaire GitHub
- Ou utilisé pour créer automatiquement un commentaire via API GitHub

---

### 7. Mise à jour du plan d'implémentation

**IMPORTANT** : Le fichier de plan d'implémentation (`{issue-number}-{feature-name}.md`) doit être **mis à jour au fur et à mesure** que l'implémentation avance.

**Mise à jour des checkboxes** :
- Cocher les tâches au fur et à mesure qu'elles sont complétées : `- [x]`
- Les tâches non complétées restent : `- [ ]`
- Ajouter des sections "Problèmes rencontrés" et "Initiatives prises" au fur et à mesure

**Structure du fichier unique** :
Le fichier combine plan d'implémentation et avancement :
- Section "Plan d'implémentation" avec checkboxes pour chaque tâche
- Section "Fichiers créés/modifiés" mise à jour au fur et à mesure
- Section "Problèmes rencontrés" ajoutée quand nécessaire
- Section "Initiatives prises" pour documenter les améliorations non prévues
- Section "Notes techniques" pour les détails importants

**Objectif** :
- Un seul fichier à maintenir (pas de séparation plan/done)
- Suivi de l'avancement en temps réel avec les checkboxes
- Documentation complète de ce qui a été fait directement dans le plan

---

## Checklist du processus

- [ ] Créer le dossier de phase si nécessaire : `docs/features/{date}-phase-{number}-{name}/`
- [ ] Créer le fichier unique `{issue-number}-{feature-name}.md` dans le dossier de phase
- [ ] Analyser l'issue GitHub (lire la description complète)
- [ ] Rechercher dans le codebase les fonctionnalités existantes
- [ ] Identifier ce qui existe déjà vs ce qui manque
- [ ] Créer le plan d'implémentation structuré avec checkboxes
- [ ] Demander validation à l'utilisateur
- [ ] Ajuster le plan selon les retours
- [ ] Créer le fichier `comment-github.md` avec le résumé (optionnel)
- [ ] Proposer de publier le commentaire sur GitHub (si possible)
- [ ] **Pendant l'implémentation** : Mettre à jour les checkboxes au fur et à mesure
- [ ] **Pendant l'implémentation** : Ajouter les sections "Problèmes rencontrés" et "Initiatives prises" si nécessaire

---

## Exemple de commande à utiliser

Quand l'utilisateur dit : "implémente la feature de ce lien https://github.com/Syllll/actograph-v3/issues/4"

**Processus à suivre** :
1. Extraire le numéro d'issue (4) et le titre depuis l'URL
2. Déterminer la phase appropriée (ex: Phase 1 - Fondations)
3. Créer le dossier de phase si nécessaire : `docs/features/2025-01-phase-1-fondations/`
4. Créer `docs/features/2025-01-phase-1-fondations/4-page-accueil.md`
5. Lire l'issue GitHub pour comprendre les besoins
6. Rechercher dans le codebase ce qui existe déjà
7. Créer le plan d'implémentation détaillé avec checkboxes
8. Présenter le plan et demander validation
9. Ajuster selon les retours
10. Créer le commentaire GitHub formaté (optionnel)
11. **Pendant l'implémentation** : Mettre à jour les checkboxes au fur et à mesure dans le même fichier
12. **Pendant l'implémentation** : Ajouter les sections "Problèmes rencontrés" et "Initiatives prises" si nécessaire

---

## Notes importantes

### Ce qu'il faut toujours faire

✅ **Analyser le code existant AVANT de proposer un plan**
- Ne pas proposer d'implémenter ce qui existe déjà
- Identifier les patterns existants à réutiliser
- Vérifier les composables/services disponibles

✅ **Demander validation avant de commencer l'implémentation**
- Le plan doit être validé par l'utilisateur
- Ajuster selon les retours avant de coder

✅ **Marquer clairement ce qui existe déjà**
- Utiliser ✅ pour ce qui est implémenté
- Utiliser ❌ pour ce qui doit être créé
- Utiliser ⚠️ pour les notes importantes

✅ **Mettre à jour le plan au fur et à mesure**
- Cocher les tâches au fur et à mesure qu'elles sont complétées
- Ajouter les sections "Problèmes rencontrés" et "Initiatives prises" directement dans le fichier de plan
- Un seul fichier à maintenir (pas de séparation plan/done)

### Ce qu'il faut éviter

❌ **Ne pas créer de plan sans analyser le code**
- Toujours vérifier ce qui existe avant de proposer

❌ **Ne pas inclure d'estimations de temps**
- Sauf si explicitement demandé par l'utilisateur

❌ **Ne pas proposer de modifier ce qui fonctionne déjà**
- Sauf si explicitement demandé

---

## Intégration dans .cursorrules

Pour utiliser ce processus automatiquement, ajouter dans `.cursorrules` :

```markdown
## Processus d'implémentation de features

Quand l'utilisateur demande d'implémenter une feature depuis un lien GitHub, suivre le processus décrit dans `docs/auto-implement.md` :

1. Créer la structure de documentation dans `docs/features/{date}-phase-{number}-{name}/`
2. Créer un seul fichier `{issue-number}-{feature-name}.md` qui combine plan + avancement
3. Analyser l'issue GitHub et le code existant
4. Créer un plan d'implémentation détaillé avec checkboxes dans le fichier unique
5. Demander validation à l'utilisateur
6. Ajuster le plan selon les retours
7. Créer un commentaire GitHub formaté dans `comment-github.md` (optionnel)
8. **Pendant l'implémentation** : Mettre à jour les checkboxes au fur et à mesure dans le même fichier
9. **Pendant l'implémentation** : Ajouter les sections "Problèmes rencontrés" et "Initiatives prises" si nécessaire

Voir `docs/auto-implement.md` pour le processus détaillé.
```

---

## Références

- Exemple de plan créé : `docs/features/2025-01-phase-1-fondations/4-page-accueil.md`
- Exemple de commentaire GitHub : `docs/features/2025-01-phase-1-fondations/comment-github.md` (optionnel)
- Structure par phases : Les features sont organisées dans `docs/features/{date}-phase-{number}-{name}/`

