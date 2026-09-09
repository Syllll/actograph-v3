# Corrections ActoGraph Mobile v3 — 9 septembre 2026

Corrections réalisées à la suite de l’audit, à la demande de l’utilisateur. Version mobile 0.0.94 ; changements locaux, sans déploiement.

## Résultat

| Constat initial | Correction |
|---|---|
| 1. Perte des limites entre sessions | Suppression de l’autocorrection globale à l’arrêt dans les deux composables. START et premières DATA sont écrits ensemble ; un arrêt pendant une pause écrit PAUSE_END puis STOP dans une transaction. |
| 2. Renommage et suppression laissant des DATA orphelines | Le renommage du protocole et des relevés de la même chronique est atomique. La suppression d’un observable utilisé, ou de sa catégorie, est refusée avec une explication. |
| 3. Homonymes entre catégories | Validation des noms d’observables sur tout le protocole, sans distinction de casse ni d’espaces périphériques, et refus du préfixe réservé aux commentaires. Import ambigu refusé avec nettoyage de la chronique partielle. |
| 4. Catégories superposées ou hors écran | Placement tenant compte de la largeur disponible et des hauteurs réellement rendues. Une ou deux colonnes, recalcul après reflow et changement de taille. Marges de 16 px et espace final pour les actions flottantes. Les positions personnalisées sont conservées lorsqu’elles restent valides. |
| 5. Annulation incomplète | Le protocole est édité dans un brouillon en mémoire. Validation atomique du protocole, de la disposition et de l’échelle ; annulation rétablissant la configuration précédente. |
| 6. Recherche recouverte | L’état vide est limité au conteneur du tableau ; le champ et son effacement restent accessibles. |
| 7. Import local absent de l’accueil | Sélecteur visible « Importer un fichier » pour .chronic et .jchronic, avec état de chargement et message de résultat. Import désactivé pendant un enregistrement ou une pause. |
| 8. Contrastes des paramètres | Icônes et curseurs adaptés aux deux thèmes, libellés lisibles, pourcentage de taille affiché. |
| Erreur d’initialisation du graphe masquée | Conservation de l’erreur après nettoyage et action Réessayer. |
| Gestion Android du retour en double | Retrait du listener concurrent ; retour confié à Quasar. |

Autres ajustements : boutons ronds restaurés, contrastes des commandes de démarrage/arrêt/pause renforcés, commandes de zoom explicites, panneau de protocole à défilement unique avec actions fixes, nom de la chronique dans l’en-tête, état d’enregistrement visible entre les pages, libellés français et rôle facultatif du cloud clarifiés. L’écran Paramètres ne sélectionne plus à tort l’onglet Accueil et ne présente plus un bouton vers lui-même. La documentation mobile reflète ces comportements.

## Vérifications

- **18 tests de régression mobiles**, exécutés avec Jest/ts-jest déjà présents dans le monorepo et SQL.js. Les migrations et repositories mobiles réels sont utilisés avec une base éphémère. Couverture des sessions successives via `useChronicle`, démarrage atomique avec panne simulée, arrêt en pause, renommage isolé par chronique, doublons, suppression protégée, brouillon, sauvegarde atomique avec panne simulée, permutation des noms, import/export JSON avec commentaire et limites de session, disposition à 320/360/768 px et différentes échelles, réduction des espaces après reflow, annulation et conservation conjointe des métadonnées position/taille.
- **145 tests core et 272 tests graph** réussis : 435 tests au total, 53 suites.
- **ESLint et TypeScript/Vue** sans diagnostic.
- **Compilation Quasar SPA** réussie. Avertissements existants d’outillage : base Browserslist ancienne, dépréciation Node et gros bundles. Aucune mise à niveau de dépendance réalisée dans ce correctif.
- **Parcours navigateur** : deux enregistrements successifs (15 relevés conservés avec quatre catégories, une sélection supplémentaire et une pause), arrêt en pause, édition/annulation, renommage/validation avec mise à jour des deux DATA historiques concernées, recherche sans résultat puis retour, graphe et commandes de zoom, paramètres et navigation.
- **Design** : inspection visuelle en 320 × 800 et 360 × 800, thèmes clair et sombre, affichage standard et grand (180 %), longue liste de protocole, dernières catégories accessibles par défilement. À 320 px, cartes de 288 px avec marges de 16 px, aucun débordement horizontal ; après réduction de hauteur, espacement entre cartes d’environ 16 px. La recherche vide a été vérifiée par hit-test DOM : le centre du champ atteint toujours l’input.

Commandes pour reproduire les vérifications depuis `mobile/` :

```bash
yarn test
yarn lint
./node_modules/.bin/vue-tsc --noEmit -p tsconfig.vue-tsc.json
./node_modules/.bin/quasar build -m spa
```

Les tests core et graph ont également été exécutés via leur Jest local, avec `--runInBand`.

## Captures après correction

| Écran | Capture |
|---|---|
| Observation, sombre, 360 px | [Catégories corrigées](./categories-corrigees-360.png) |
| Observation, clair, 320 px | [Disposition sur petit écran](./categories-clair-corrigees-320.png) |
| Paramètres, sombre, 360 px | [Contrastes corrigés](./settings-dark-corriges-360.png) |
| Édition du protocole, sombre, 360 px | [Actions fixes et liste](./protocole-corrige-360.png) |

## Portée et limites

La prévisualisation utilise la copie isolée de l’application dans `/tmp/actograph-mobile-audit`, avec uniquement le pont SQLite remplacé par SQL.js et des données synthétiques. La configuration de thème est forcée uniquement dans cette copie pour les essais ; l’application conserve son réglage automatique. Les sources applicatives corrigées sont recopiées à l’identique dans la prévisualisation. Les vérificateurs et le build tournent sur le véritable projet.

Aucun appareil Android/iOS ni émulateur connecté : le stockage natif, le retour matériel, le clavier, la reprise après arrière-plan et le partage natif restent à vérifier sur appareil. La présence et la présentation du sélecteur local sont contrôlées ; l’import/export JSON est testé au niveau service, sans validation du sélecteur système natif. Aucun compte cloud utilisé et aucun envoi effectué. Le graphe conserve son fond blanc de tracé, commun au moteur partagé.

Les fichiers existants ne changent pas de format et aucune migration de schéma n’est ajoutée. Les relevés déjà perdus avant le correctif ne sont pas reconstruits. Les historiques ambigus ne sont pas réattribués arbitrairement : l’application refuse l’opération et explique le problème.
