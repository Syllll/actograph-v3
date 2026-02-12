# Documentation ActoGraph v3

## Structure du dossier docs/

Ce dossier suit les conventions de la **Knowledge Base Improba** (`.knowledge-base/recipes/glutamat/auto-implement.md`).

```
docs/
├── README.md                    # Ce fichier
├── architecture.md              # (à créer si nécessaire)
├── authentification.md          # Documentation authentification
├── chronic.md                   # Documentation format .chronic
├── deployment.md                # Documentation déploiement
├── electron-desktop-build.md    # Build Electron desktop
├── graph.md                     # Documentation graphe d'activité
├── issues-status.md             # État des issues GitHub
├── monorepo-build.md            # Build monorepo
├── protocol.md                  # Documentation protocole
├── reading.md                   # Documentation relevés
├── features/                    # Documentation PÉRENNE de features terminées
│   └── {timestamp}-{issue}-{name}-{author}.md
├── plans/                       # Plans d'implémentation PARTAGEABLES
│   └── {timestamp}-{issue}-{name}-{author}.md
├── reviews/                     # Reviews IMPORTANTES à conserver
│   └── {timestamp}-{name}-{author}.md
└── temp/                        # Fichiers TEMPORAIRES (non trackés par git)
    ├── .gitignore
    └── {timestamp}-{name}-{author}.md
```

## Convention de nommage des fichiers

**Format** :
```
{timestamp}-{issue-number}-{feature-name}-{author}.md   (si issue existe)
{timestamp}-{feature-name}-{author}.md                  (si pas d'issue)
```

- **Timestamp** : `YYYYMMDDhhmmss` (ex: `20260212143000`)
- **Issue** : Numéro de l'issue GitHub (ex: `4`, `22-23`)
- **Feature name** : Nom court en kebab-case (ex: `page-accueil`, `autosave`)
- **Author** : Prénom-Nom (ex: `Sylvain-Meylan`)

**Exemples** :
- `docs/features/20250101000000-4-page-accueil-Sylvain-Meylan.md`
- `docs/plans/20260212000000-recette-v01-corrections-Sylvain-Meylan.md`
- `docs/reviews/20250115000000-auto-correct-shared-Sylvain-Meylan.md`

## Types de documentation

| Dossier | Contenu | Tracké par Git | Durée de vie |
|---------|---------|----------------|--------------|
| `docs/features/` | Documentation pérenne de features terminées | ✅ Oui | Permanente |
| `docs/plans/` | Plans d'implémentation réutilisables / en cours | ✅ Oui | Long terme |
| `docs/reviews/` | Reviews importantes à conserver | ✅ Oui | Long terme |
| `docs/temp/` | Fichiers temporaires en cours de travail | ❌ Non | Temporaire |

## Workflow

1. **Pendant l'implémentation** : Créer le fichier dans `docs/temp/`
2. **Une fois terminé** :
   - **Documentation à conserver** → déplacer vers `docs/features/` (nettoyer les TODOs)
   - **Plan réutilisable** → déplacer vers `docs/plans/`
   - **Review importante** → déplacer vers `docs/reviews/`
   - **Jetable** → supprimer ou laisser dans `docs/temp/` (non tracké)

## Organisation par sous-dossiers (si besoin)

Si le nombre de fichiers dans `docs/features/` ou `docs/plans/` devient trop important, il est possible de créer des sous-dossiers thématiques :

```
docs/features/
├── mobile/
│   └── 20251201000000-plan-implementation-mobile-Sylvain-Meylan.md
└── 20250101000000-4-page-accueil-Sylvain-Meylan.md
```

## Référence

Voir `.knowledge-base/recipes/glutamat/auto-implement.md` pour le processus complet et le format détaillé des fichiers de feature.
