# Frontend ActoGraph v3

Interface Quasar/Vue 3 de l'application bureau Electron et du mode web. Le [README principal](../README.md) décrit la préparation complète, les `.env`, Node 20 et le lancement de l'API SQLite dans un terminal séparé.

## Commandes

Depuis `front/`, après installation des dépendances :

```bash
yarn quasar dev -m electron     # Développement bureau, API séparée déjà lancée
yarn dev                       # Développement web
yarn lint
yarn typecheck
yarn test --runInBand
```

Pour un installeur, utiliser `bash scripts/build-electron.sh` depuis la racine. `yarn build` dans ce dossier construit le mode web. Les sources partagées sont résolues par les alias Vite vers `../packages/core/src` et `../packages/graph/src`, en développement comme au build.

## Repères dans le code

- `src/pages/gateway/` : chargement de l'API, connexion locale automatique et choix de l'accès étudiant/pro.
- `src/pages/userspace/` : Mes chroniques, protocole, observation, graphe, statistiques et licence.
- `src/composables/use-observation/` : chronique courante, timer, protocole et synchronisation des relevés.
- `src/composables/use-chronicle-actions/` et `use-chronicle-navigation/` : actions fichier/cloud et navigation commune au tiroir et à l'accueil.
- `src/services/` : clients de l'API locale et des services cloud actograph.io.
- `src-electron/electron-main.ts` : fenêtres, fichiers, mise à jour et démarrage de l'API embarquée.
- `src-electron/backend-supervisor.ts` : essais, reprise, santé et arrêt du backend.
- `src-electron/electron-preload.ts` : bridge `window.api` et connexion au backend.
- `lib-improba/` : composants UI et utilitaires ; les pages utilisent `defineComponent` avec `setup()`.

Les tests Jest incluent le cycle de vie Electron, les URLs autorisées, les statistiques, les préférences graphiques et les utilitaires. Consulter [le parcours bureau](../docs/desktop.md), [l'architecture](../docs/architecture.md) et [l'index documentaire](../docs/README.md).
