# Revue de l'export SVG, deux cycles

Revue réalisée le 21 octobre 2026 sur `feat/graph-svg-export`. Le second cycle inclut les changements de `main` jusqu'au commit `63f19b5`.

## Cycle 1 : composition des documents et libellés

Deux défauts ont été reproduits par des tests en échec avant correction :

- Le préfixage global des références `url(#...)` modifiait aussi les noms saisis par l'utilisateur et les noms de polices. La réécriture est maintenant limitée aux attributs de définition et de référence SVG dans les balises.
- L'échappement XML conservait certains caractères interdits dans XML 1.0, notamment les demi-surrogates isolés et U+FFFE/U+FFFF. Ils sont retirés en préservant les caractères Unicode supplémentaires valides, dont les emoji.

Les tests de composition, de scène et de restauration après erreur passent après correction : 26 tests dans les trois suites ciblées.

## Cycle 2 : fidélité des motifs et intégration

La branche a été rebasée sur `main` avant cette seconde revue. Quatre nouveaux tests en échec ont confirmé deux écarts :

- La conversion des couleurs RGBA en hexadécimal perdait la transparence des motifs. Le SVG porte maintenant `fill-opacity` et `stroke-opacity` sur les primitives du motif, en conservant la superposition des traits de grille.
- Les métadonnées SVG des motifs conservaient la couleur brute alors que leur texture utilisait une couleur normalisée. Le descripteur utilise désormais la même couleur normalisée, y compris le repli prévu pour une couleur importée invalide.

Le test du magasin de textures utilise la véritable normalisation du cœur, à la place d'une imitation locale de cette fonction.

## Vérifications finales

| Vérification | Résultat |
| --- | --- |
| Moteur du graphe, Jest | 41 suites, 341 tests réussis |
| Frontend, Jest | 39 suites, 370 tests réussis |
| Cœur, Jest | 21 suites, 174 tests réussis |
| API, `yarn test --runInBand --silent` sous Node 20 | 12 suites, 84 tests réussis |
| Mobile, Europe/Paris et America/Toronto | 40 tests réussis par fuseau ; un test déjà ignoré par fuseau |
| TypeScript du graphe, `tsc --noEmit` | Réussi |
| Frontend, `vue-tsc --noEmit` | Réussi |
| ESLint des fichiers concernés | Réussi |
| Compilation de l'interface SPA par le builder Quasar | Réussie, hors packaging Electron/API |
| Chrome, export réel SVG/PNG/JPEG | Réussi |
| Inkscape, rendu du SVG combiné | Réussi |

Les scénarios visuels utilisent des séries continues et discrètes, des frises, les cinq motifs, des arrière-plans, des pauses, une catégorie masquée, des noms contenant `url(#repos)`, des caractères XML/Unicode, des couleurs RGBA et deux étirements d'axes. Les fichiers SVG sont analysables, contiennent leurs formes vectorielles sans image incorporée, ont le même cadrage que le PNG en résolution CSS, et les exports successifs restaurent le zoom.

Les premiers essais API exécutés directement sous Node 24 échouaient aussi sur une copie de `main` : binaire SQLite compilé pour Node 20 et variables `npm_package_*` absentes. L'exécution normale par Yarn sous Node 20 réussit sans changement de code API.

Aucun défaut bloquant identifié ne reste ouvert après ces deux cycles. Le packaging Electron n'a pas été réalisé dans cette revue.
