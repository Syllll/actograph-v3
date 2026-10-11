# Documentation ActoGraph v3

Le [README principal](../README.md) est la porte d'entrée pour télécharger et démarrer le projet. Cet index oriente vers les guides de l'application bureau, mode principal du dépôt. Documentation revue contre le code de `main` le **11 octobre 2026** ; les dates des comptes rendus restent celles des vérifications historiques.

## Utiliser et comprendre le bureau

| Guide | Contenu |
|---|---|
| [Parcours bureau](desktop.md) | Mes chroniques, création, Rec/Pause, Terminer, analyse, fichiers et cloud |
| [Architecture](architecture.md) | Electron, preload, superviseur, API locale, SQLite et packages |
| [Chroniques et fichiers](chronic.md) | `.jchronic`, import `.chronic` v1, duplication et autosave |
| [Protocoles](protocol.md) | Catégories, observables, édition, ordre, copie et préférences |
| [Relevés](reading.md) | Types, horodatage, édition, synchronisation et API |
| [Pauses](pauses.md) | Calendrier, chronomètre, vidéo, graphe et statistiques |
| [Graphiques](graph.md) | Intégration PixiJS, axes, zoom, export et personnalisation |
| [Moteur de graphe v2](graph-engine-v2.md) | Architecture interne du moteur de rendu |
| [Authentification](authentification.md) | JWT de l'API locale et [connexion cloud](authentification.md#cloud-actographio) |
| [Comptes et licences](comptes-et-licences.md) | Accès étudiant/pro, compte local et compte cloud |
| [Validation des licences](license-validation.md) | Validateur public, injection privée en CI et activation |

## Développer, construire et publier

- [Monorepo et builds](monorepo-build.md) : installations indépendantes, alias sources et dépendance de l'API à `core/dist`.
- [Build Electron](electron-desktop-build.md) : esbuild, SQLite natif, démarrage supervisé et auto-update.
- [Publication et déploiement](deployment.md) : tags, canaux, plateformes, signature et reprise de CI.
- [Frontend](../front/README.md), [API](../api/README.md), [core](../packages/core/README.md) et [graph](../packages/graph/README.md) : points d'entrée des sous-projets.
- [Mobile](../mobile/README.md) : workflow Capacitor Android/iOS, distinct du bureau.
- [Instructions du dépôt](../AGENTS.md) : spécificités techniques et références IKB. Le projet garde TypeORM et des installations sans workspaces, même si le template IKB courant emploie une autre architecture.

## Documents historiques

Les dossiers `features/`, `plans/`, `reviews/` et `audits/` conservent le contexte de travaux datés. Un plan ou une capture ne décrit pas nécessairement l'interface actuelle ; utiliser d'abord les guides ci-dessus et le code.

- [Revue du cycle de vie Electron du 1er octobre](reviews/2026-10-01-electron-lifecycle.md) : preuves de tests et de release de cette intervention.
- [Compte rendu UX bureau du 22 septembre](reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md) : contexte de la refonte, complété par les guides actuels.
- [Récapitulatif des issues de septembre](recap-issues-2026-09.md) et [de mai](recap-issues-2026-05.md) : instantanés du board.
- [État ancien des issues](issues-status.md) : archive de janvier 2025, déjà signalée comme obsolète. L'état courant est sur le [board GitHub](https://github.com/users/Syllll/projects/2).

## Organisation et entretien

Les guides transversaux vivent directement dans `docs/`. Les documents datés du dépôt utilisent historiquement `{timestamp}-{issue éventuelle}-{nom}-{auteur}.md` (`YYYYMMDDhhmmss`) dans `features/`, `plans/` ou `reviews/` ; certains rapports utilisent une date ISO. Conserver leurs noms et leurs dates pour préserver les liens et les preuves.

`docs/temp/` sert aux notes temporaires et ignore les nouveaux fichiers via son `.gitignore` ; quelques anciens fichiers y restent déjà suivis par Git. Ce dossier ne doit pas servir de référence principale.

Pour les nouvelles features qui suivent le workflow partagé, consulter `.knowledge-base/recipes/glutamat/auto-implement/index.md`. Les guides pérennes du projet sont à mettre à jour quand une commande, un contrat d'API ou un parcours utilisateur change. Référencer les scripts et fichiers réellement présents, et distinguer un contrôle effectué aujourd'hui d'une preuve historique.
