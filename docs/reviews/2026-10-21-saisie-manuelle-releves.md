# Saisie manuelle des relevés : bilan des trois cycles

Date : 21 octobre 2026. Branche : `fix/manual-reading-insertion`.

## Comportement livré

Le bouton **+** copie le relevé sélectionné juste après celui-ci. Il conserve
son libellé, sa description, son type et son horodatage exact, avec une nouvelle
identité. Sans sélection, il copie le dernier relevé ; dans une table vide, il
crée le premier relevé au temps courant du mode choisi. Aucun formulaire
d'ajout ne s'ouvre. Le bouton Dupliquer a été retiré.

La nouvelle ligne est sélectionnée. Le défilement utilise son index dans le
tableau effectivement trié, y compris en ordre décroissant et avec le rendu
virtuel. La recherche est effacée lors de l'ajout pour ne pas cacher la copie.
La sélection est visible et accessible au clavier. Les champs conservent leurs
touches d'édition. La sélection et les brouillons restent attachés à la bonne
ligne lorsque le serveur lui attribue son ID.

Un champ optionnel `sortOrder` conserve l'ordre des relevés qui partagent un
horodatage, dans SQLite, l'API et les fichiers `.jchronic`. Il évite de décaler
artificiellement les dates. La migration ajoute une colonne nullable ; les
anciennes chroniques restent compatibles. Leur simple ouverture ne réécrit
pas les relevés.

Ce lot porte sur la saisie dans le tableau existant. L'entrée dédiée « Saisie
manuelle » dans Nouvelle chronique reste un développement distinct.

Ce complément a depuis été réalisé et revu dans le
[bilan de saisie manuelle complète](2026-10-21-saisie-manuelle-complete.md).

## Cycle 1 : persistance, ordre et visibilité

La revue a identifié un risque d'ordre incorrect après interruption entre
l'enregistrement de la nouvelle copie et celui des positions existantes. Les
positions modifiées sont désormais envoyées avant la création. Si cette mise
à jour échoue, la copie reste locale et sélectionnée, et aucun POST n'est lancé.

La normalisation des positions à la simple ouverture aurait également provoqué
une réécriture de toutes les anciennes lignes. Elle est limitée aux mutations
locales. Un test charge 1 000 relevés anciens et vérifie qu'aucune écriture n'a
lieu sans modification.

Les tests d'interface ont été renforcés avec le vrai QTable de Quasar : 240
relevés, insertion à horodatage identique au milieu du tableau, sélection et
rendu virtuel en tri croissant et décroissant, puis déplacement après édition.
Un test SQLite couvre export JSON, parsing, normalisation, réimport et lecture
paginée en conservant l'ordre.

## Cycle 2 : collecte en direct et reprises réseau

La revue indépendante a reproduit une inversion de relevés capturés au même
instant lorsque l'utilisateur conservait une sélection dans le tableau.
L'insertion après une source est maintenant explicite pour la copie manuelle.
La collecte en direct ajoute dans l'ordre des captures, sans déplacer la
sélection manuelle.

Les nouvelles tentatives d'un POST dont la réponse a été perdue réutilisent
désormais la ligne déjà enregistrée, identifiée par observation et `tempId`.
Elles ne remplacent pas une édition ultérieure. Deux relevés légitimes de même
nom et de même horaire, mais d'identités différentes, restent distincts.

Les tests couvrent aussi les modifications, ajouts et suppressions réalisés
pendant une requête en cours, ainsi que le changement de chronique avant le
retour du serveur. Seuls les instantanés effectivement envoyés sont acquittés,
pour ne pas perdre les modifications suivantes.

## Cycle 3 : atomicité, copie exacte et styles

La troisième revue indépendante a reproduit une perte d'atomicité dans la
première version de la protection contre les doublons. La création retrouve
une recherche groupée des identités existantes et un seul `save(array)`
transactionnel. Un test SQLite vérifie qu'une ligne invalide en fin de lot
annule aussi les lignes précédentes. Un autre contrôle l'écriture groupée.
L'ordre des résultats suit celui de la requête, même en présence d'identités
répétées dans le même lot.

La copie d'un ancien libellé explicitement vide conserve désormais cette valeur
au lieu de la remplacer par le libellé par défaut. Un test reproduit ce cas.
Les deux corrections ont été revérifiées par le relecteur du troisième cycle.

La compilation UI a également révélé des règles CSS imbriquées invalides dans
le tableau. Elles ont été remplacées par des sélecteurs Vue `:deep(...)`
explicites, puis les tests et la compilation UI ont été relancés.

## Vérifications finales

| Contrôle | Résultat |
|---|---|
| Frontend, `yarn test --runInBand` | 28 suites, 222 tests réussis |
| API, `yarn test --runInBand` | 10 suites, 80 tests réussis |
| Core, `yarn test --runInBand` | 21 suites, 163 tests réussis |
| Total | 465 tests réussis, dont 68 ajoutés pour ce lot |
| Frontend, `yarn lint` | Réussi |
| Frontend, `yarn typecheck` | Réussi |
| API, contrôle TypeScript sans émission | Réussi |
| Core, `yarn build` | Réussi |
| Compilation API avec `tsconfig.build.json`, sortie temporaire | Réussie sous Node 20 |
| Compilation de production UI via le builder Quasar/Vite, sortie temporaire | Réussie sous Node 20 |
| `git diff --check` | Réussi |

Le build global standard rencontre un refus d'accès au nettoyage de l'ancien
`api/dist`, appartenant à un autre utilisateur système. Les compilations API
et UI ont été vérifiées séparément dans `/tmp`, sans changer les droits de ce
dossier. La compilation UI séparée ne lance pas le hook de packaging de l'API.

Les tests d'interface s'exécutent dans jsdom, dont deux avec le véritable
tableau virtuel Quasar et une géométrie simulée. Ils ne constituent pas une
recette visuelle manuelle dans Electron. Aucun installeur ni nouvelle version
publique n'a été produit. Les reprises réseau testées correspondent au client
propriétaire unique et à ses tentatives séquentielles ; elles ne prouvent pas
l'absence de doublons entre plusieurs propriétaires écrivant simultanément.
