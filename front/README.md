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

## Échanges tabulaires

Les en-têtes Relevés et Protocole donnent accès aux échanges CSV et Excel en mode bureau Electron. L'export porte sur toutes les données de la chronique, y compris les relevés absents du protocole. L'import montre un aperçu avant ajout ou remplacement. Un remplacement confirmé crée une copie récupérable dans les chroniques. Un import de protocole ne modifie jamais les relevés.

Les CSV et XLSX ActoGraph sont réimportables. Les tableaux externes doivent contenir les en-têtes et types reconnus par le format partagé, sans assistant de correspondance libre. Pour un classeur à plusieurs feuilles, choisir explicitement la feuille à lire. Les cellules Excel avec formule ou valeur structurée sont refusées. Les exports texte de relevés ActoGraph 1 (`.txt`) sont reconnus ; pour les dates calendrier, le fuseau du fichier doit être confirmé. Un protocole peut être extrait d'un fichier ActoGraph 1 `.chronic`, sans importer ses relevés. Les classeurs ODS et les relevés extraits de `.chronic` ne sont pas pris en charge par ce parcours.

Les avertissements persistants de correspondance apparaissent dans Relevés, Protocole, Graphe et Statistiques. Le filtre dans Relevés permet de retrouver les données sans nom, les libellés absents et les homonymes, puis de rétablir l'affichage complet.
