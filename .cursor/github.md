# GitHub MCP — ActoGraph v3

Ce projet utilise le MCP GitHub via `.cursor/mcp.json` et le script wrapper `.cursor/start-github-mcp.sh` (même approche que etreprof-v2).

## Contexte projet

| Élément | Valeur |
| --- | --- |
| Dépôt | [Syllll/actograph-v3](https://github.com/Syllll/actograph-v3) |
| Owner | `Syllll` |
| Repo | `actograph-v3` |
| Board issues | [Project #2](https://github.com/users/Syllll/projects/2) |
| Vue board | [views/2](https://github.com/users/Syllll/projects/2/views/2) |

Lors des appels MCP GitHub (issues, PRs, projects), utiliser ces identifiants par défaut :

- **Repository** : `owner=Syllll`, `repo=actograph-v3`
- **Project** : `owner=Syllll`, `project_number=2`

## Configuration du token

Le token est chargé depuis `.env.mcp` à la racine du projet (non versionné).

1. Copier le modèle si besoin :
   ```bash
   cp .env.mcp.example .env.mcp
   ```
2. Renseigner `GITHUB_PERSONAL_ACCESS_TOKEN` dans `.env.mcp`
3. Redémarrer Cursor
4. Vérifier : Settings → Tools & Integrations → MCP → point vert sur `github`

Pour les **Cloud Agents Cursor**, ajouter `GITHUB_PERSONAL_ACCESS_TOKEN` dans Dashboard > Cloud Agents > Secrets.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `.cursor/mcp.json` | Pointe vers le script wrapper |
| `.cursor/start-github-mcp.sh` | Charge `.env.mcp`, lance `@modelcontextprotocol/server-github` via npx |
| `.env.mcp` | Token GitHub (gitignored) |
| `.env.mcp.example` | Modèle sans secret |

## Références internes

- État des issues (analyse locale) : `docs/issues-status.md`
- Processus d'implémentation : `.knowledge-base/recipes/glutamat/auto-implement.md`
