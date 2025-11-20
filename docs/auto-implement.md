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

**Format du dossier** : `docs/features/{issue-number}-{feature-name}/`

**Format du fichier principal** : `{issue-number}-{feature-name}.md`

**Exemple** :
- Issue #4 sur la page d'accueil
- Dossier : `docs/features/4-page-accueil/`
- Fichier : `docs/features/4-page-accueil/4-page-accueil.md`

**Commandes** :
```bash
mkdir -p docs/features/{issue-number}-{feature-name}
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

### 7. Documentation post-implémentation

**Après avoir implémenté la feature**, créer un fichier : `docs/features/{issue-number}-{feature-name}/{issue-number}-done.md`

**Contenu à inclure** :

```markdown
# Feature #{number} - Implémentation terminée

## Ce qui a été fait

### Fichiers créés
- Liste des nouveaux fichiers créés avec leur chemin complet
- Description de leur rôle

### Fichiers modifiés
- Liste des fichiers modifiés
- Description des modifications apportées

### Fonctionnalités implémentées
- Liste des fonctionnalités réalisées
- Détails sur l'implémentation

## Problèmes rencontrés

### Problèmes techniques
- Description des problèmes techniques rencontrés
- Solutions apportées
- Workarounds si applicable

### Décisions prises
- Décisions architecturales prises pendant l'implémentation
- Raisons de ces décisions

## Initiatives prises

### Améliorations non prévues
- Améliorations ou optimisations ajoutées en plus du plan initial
- Refactorings effectués
- Optimisations de performance

### Patterns réutilisés
- Patterns existants réutilisés
- Composables/services existants utilisés

## Tests effectués

- Tests manuels réalisés
- Scénarios testés
- Bugs découverts et corrigés

## Notes finales

- Points d'attention pour la maintenance
- Améliorations futures possibles
- Documentation supplémentaire créée
```

**Objectif** :
- Documenter ce qui a été réellement fait
- Capturer les apprentissages et problèmes rencontrés
- Faciliter la maintenance future
- Servir de référence pour des features similaires

---

## Checklist du processus

- [ ] Créer le dossier `docs/features/{issue-number}-{feature-name}/`
- [ ] Créer le fichier `{issue-number}-{feature-name}.md`
- [ ] Analyser l'issue GitHub (lire la description complète)
- [ ] Rechercher dans le codebase les fonctionnalités existantes
- [ ] Identifier ce qui existe déjà vs ce qui manque
- [ ] Créer le plan d'implémentation structuré
- [ ] Demander validation à l'utilisateur
- [ ] Ajuster le plan selon les retours
- [ ] Créer le fichier `comment-github.md` avec le résumé
- [ ] Proposer de publier le commentaire sur GitHub (si possible)
- [ ] Après implémentation : Créer le fichier `{issue-number}-done.md` avec la documentation post-implémentation

---

## Exemple de commande à utiliser

Quand l'utilisateur dit : "implémente la feature de ce lien https://github.com/Syllll/actograph-v3/issues/4"

**Processus à suivre** :
1. Extraire le numéro d'issue (4) et le titre depuis l'URL
2. Créer `docs/features/4-page-accueil/4-page-accueil.md`
3. Lire l'issue GitHub pour comprendre les besoins
4. Rechercher dans le codebase ce qui existe déjà
5. Créer le plan d'implémentation détaillé
6. Présenter le plan et demander validation
7. Ajuster selon les retours
8. Créer le commentaire GitHub formaté
9. **Après implémentation** : Créer `docs/features/4-page-accueil/4-done.md` avec la documentation post-implémentation

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

✅ **Documenter après l'implémentation**
- Créer le fichier `{issue-number}-done.md` après avoir terminé l'implémentation
- Documenter les problèmes rencontrés et les solutions
- Noter les initiatives prises et améliorations apportées

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

1. Créer la structure de documentation dans `docs/features/{issue-number}-{feature-name}/`
2. Analyser l'issue GitHub et le code existant
3. Créer un plan d'implémentation détaillé dans `{issue-number}-{feature-name}.md`
4. Demander validation à l'utilisateur
5. Ajuster le plan selon les retours
6. Créer un commentaire GitHub formaté dans `comment-github.md`
7. **Après implémentation** : Créer `{issue-number}-done.md` avec la documentation post-implémentation

Voir `docs/auto-implement.md` pour le processus détaillé.
```

---

## Références

- Exemple de plan créé : `docs/features/4-page-accueil/4-page-accueil.md`
- Exemple de commentaire GitHub : `docs/features/4-page-accueil/comment-github.md`
- Exemple de documentation post-implémentation : `docs/features/{issue-number}-{feature-name}/{issue-number}-done.md` (à créer après implémentation)

