# Audit ActoGraph Mobile v3 — 9 septembre 2026

> Les corrections demandées après cet audit sont décrites dans [corrections.md](./corrections.md), avec les vérifications et captures après correction. Les constats ci-dessous décrivent l’état initial.

Version mobile 0.0.94, révision `a702bef`. Audit du code présent dans le dépôt, sans correction du code applicatif.

**Avis : plusieurs défauts affectent les données d’observation et l’accès aux boutons sur téléphone. Les contrôles techniques passent, mais la version nécessite des corrections avant validation terrain.**

## Vérifications réalisées

| Contrôle | Résultat |
|---|---|
| ESLint mobile | Aucun diagnostic |
| TypeScript / Vue (`vue-tsc --noEmit -p tsconfig.vue-tsc.json`) | Aucun diagnostic |
| Compilation Quasar SPA | Réussie ; avertissements de taille de certains bundles et Browserslist ancien |
| Tests du package core | 18 suites, 145 tests réussis |
| Tests du package graph | 34 suites, 272 tests réussis |
| Prévisualisation | Accueil, paramètres, création, protocole, enregistrement, relevés, recherche et graphe |
| Formats inspectés | 360 × 800 et 320 × 740, thème sombre |
| Scénarios ciblés hors navigateur | Correction de deux sessions et annulation de positions sans métadonnées sauvegardées |

Le navigateur ne prend pas en charge la base native telle que livrée : `jeep-sqlite` n’est pas installé dans le DOM. Pour poursuivre les tests fonctionnels, une **copie isolée dans /tmp** remplace uniquement le pont SQLite natif par SQL.js, avec une base jetable ; les pages, services, repositories et migrations sont conservés. Le vérificateur de types de cette copie est désactivé : ESLint et TypeScript ont été exécutés séparément sur les sources originales. Le code applicatif du dépôt n’a pas été modifié. Les données de test sont synthétiques.

Aucun appareil ni émulateur n’est connecté. Cet audit ne valide donc pas l’APK/IPA, le stockage natif, les migrations sur un appareil existant, le clavier virtuel, la mise en arrière-plan réelle, les gestes tactiles natifs, ni la feuille de partage. Aucun accès au compte cloud ni transfert vers le cloud n’a été effectué. Le thème clair n’a pas été parcouru.

## Défauts prioritaires

### 1. P1 — L’arrêt d’une deuxième session efface les limites entre sessions

**Reproduit dans l’interface de test et par appel du code original.**

Scénario : démarrer → arrêter → démarrer de nouveau dans la même chronique → arrêter. Avec un observable continu, les six relevés attendus deviennent quatre : le premier STOP et le deuxième START disparaissent. Dans le test UI, le premier arrêt à 20:25:37.351 et le second démarrage à 20:26:04.830 ne sont plus présents après le deuxième arrêt.

L’arrêt lance automatiquement une correction sur **toute la chronique**. Cette correction garde le premier START et le dernier STOP, traitant les autres comme des doublons. Le temps entre deux sessions peut alors être interprété comme une observation continue, ce qui fausse le graphe et les durées.

Sources : [mobile/src/composables/use-chronicle/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-chronicle/index.ts:221), [mobile/src/composables/use-readings-auto-correct.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-readings-auto-correct.ts:78), [packages/core/src/utils/reading-auto-correct.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/packages/core/src/utils/reading-auto-correct.ts:108).

Correction proposée : préserver chaque paire START/STOP valide ; corriger au niveau de la session, dans une transaction, sans suppression silencieuse des limites valides. Ajouter un scénario de non-régression START/DATA/STOP/START/DATA/STOP.

### 2. P1 — Renommer un observable fait disparaître ses anciens relevés du graphe

**Reproduit dans l’interface de test.**

Après avoir enregistré « Assis », renommer cet observable en « Assis renommé ». Le tableau conserve les DATA nommées « Assis », mais le protocole ne contient plus ce nom. Le graphe n’affiche plus ces données et écrit `Category not found for observable Assis` dans la console, tout en annonçant « Graphique prêt ».

Le renommage modifie uniquement `protocol_items.name`. Les DATA se rattachent aux observables par le nom, sans identifiant stable. La suppression d’un observable utilisé présente le même problème de données orphelines.

Sources : [mobile/src/pages/observation/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/observation/Index.vue:1110), [mobile/src/services/protocol.service.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/services/protocol.service.ts:77), [packages/graph/src/pixi-app/data-area/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/packages/graph/src/pixi-app/data-area/index.ts:261).

Correction proposée : utiliser une identité stable pour les références ; à court terme, migrer transactionnellement les anciens noms avec un contrôle d’unicité, ou interdire explicitement le renommage/la suppression des observables déjà utilisés. Le graphe doit signaler les relevés non rattachés.

### 3. P1 — Les noms identiques entre catégories mélangent les observations

**Confirmé par lecture de la chaîne validation → stockage → rendu ; pas de scénario UI complet dédié.**

L’éditeur vérifie l’unicité uniquement au sein de la catégorie. Il permet donc deux observables « Autre » dans deux catégories. Or un relevé ne contient que le nom, et le graphe affecte ce nom à la **première catégorie correspondante**. La restauration des boutons actifs recherche également les DATA par nom : une saisie peut affecter l’état affiché dans plusieurs catégories.

Sources : [mobile/src/pages/observation/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/observation/Index.vue:903), [mobile/src/pages/observation/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/observation/Index.vue:724), [mobile/src/database/repositories/reading.repository.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/database/repositories/reading.repository.ts:99), [packages/graph/src/pixi-app/data-area/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/packages/graph/src/pixi-app/data-area/index.ts:263).

Correction proposée : imposer provisoirement des noms uniques dans tout le protocole, y compris lors des renommages et imports ; prévoir un rattachement par identifiant dans les modèles et formats d’échange.

### 4. P1 — La grille masque des boutons dès que les catégories grandissent

**Reproduit visuellement à 360 et 320 px.**

Un protocole de quatre catégories contenant cinq observables chacune suffit. Les lignes commencent à y = 16 et y = 216 dans le conteneur, avec un intervalle fixe de 200 px. Deux cartes de la première ligne mesurent environ 412 px de haut : la deuxième ligne recouvre plus de 200 px de leur contenu. Plusieurs observables sont inaccessibles sous les cartes suivantes.

À 320 px, la deuxième colonne commence toujours à x = 186 et mesure 150 px : elle dépasse également le bord droit. Le réglage de taille agrandit les cartes sans recalculer l’espacement de la grille, ce qui aggrave les chevauchements.

La mesure des hauteurs existante ne sert qu’à dimensionner le conteneur ; elle ne réorganise pas les cartes.

Sources : [mobile/src/composables/use-edit-mode/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-edit-mode/index.ts:78), [mobile/src/composables/use-edit-mode/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-edit-mode/index.ts:252), [mobile/src/pages/observation/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/observation/Index.vue:1256).

Correction proposée : calculer les positions selon la largeur disponible et les hauteurs réelles, ou utiliser une grille fluide par défaut ; réserver le placement libre à un mode explicite avec détection de chevauchement.

Preuves : [capture à 360 px](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/docs/audits/2026-09-09-mobile/categories-360.png), [capture à 320 px](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/docs/audits/2026-09-09-mobile/categories-320.png).

## Défauts d’usage et de cohérence

### 5. P2 — « Annuler l’édition » n’annule pas toutes les modifications

**Reproduit sur le renommage dans l’interface et sur les positions par appel du code original.**

Les modifications du protocole sont enregistrées immédiatement. Renommer un observable, fermer le panneau puis appuyer sur « Annuler l’édition » conserve le renommage.

Même pour la disposition, une catégorie sans position préalablement persistée conserve sa position déplacée : le test passe de `{x:16,y:16}` à `{x:80,y:250}` après annulation. `initializePositions` ne remet pas à zéro les valeurs en mémoire lorsque les métadonnées n’en contiennent pas.

Sources : [mobile/src/pages/observation/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/observation/Index.vue:1175), [mobile/src/composables/use-edit-mode/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-edit-mode/index.ts:234), [mobile/src/composables/use-edit-mode/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-edit-mode/index.ts:320).

Correction proposée : capturer l’état à l’entrée du mode édition et restaurer ce brouillon à l’annulation, avec persistance uniquement à la validation. Si le protocole reste enregistré immédiatement, l’interface doit le dire et distinguer clairement ce comportement de l’annulation de disposition.

### 6. P2 — Une recherche vide de résultats recouvre son propre champ

**Reproduit dans le DOM de la prévisualisation.**

Saisir un terme sans correspondance. L’overlay « Aucun relevé trouvé » est placé en absolu sur tout le contenu de la page, y compris le champ de recherche. Au centre du champ, `document.elementFromPoint` renvoie l’overlay et non l’input : celui-ci intercepte donc le pointage tactile. Le message demande pourtant d’essayer un autre terme.

Un clic sémantique d’automatisation peut encore vider le champ ; il ne suffit pas à valider son accessibilité au doigt.

Sources : [mobile/src/pages/readings/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/readings/Index.vue:86), [mobile/src/pages/readings/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/readings/Index.vue:344).

Correction proposée : limiter l’état vide au conteneur du tableau, ou empêcher cet overlay non interactif d’intercepter les pointeurs.

### 7. P2 — L’import local annoncé n’a pas de point d’entrée

**Confirmé par inspection des routes, composants, appels et configuration Android.**

Le service sait importer un `.chronic` ou `.jchronic`, mais `importFile` n’est appelé par aucun écran. Aucun sélecteur de fichier n’est exposé ; Android ne déclare pas de réception de fichier partagé/ouvert. L’import accessible passe par le cloud et demande une connexion.

Un utilisateur recevant un fichier par messagerie ou transfert local ne peut donc pas le charger dans le parcours offline présenté par le README.

Sources : [mobile/src/services/import.service.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/services/import.service.ts:306), [mobile/src/pages/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/Index.vue:74), [mobile/src-capacitor/android/app/src/main/AndroidManifest.xml](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src-capacitor/android/app/src/main/AndroidManifest.xml:21), [mobile/README.md](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/README.md:1).

Correction proposée : ajouter « Importer un fichier » à l’accueil, relié au service existant, et prévoir l’ouverture depuis les applications de fichiers. Décrire le cloud comme une option, et actualiser la documentation.

### 8. P2 — Les réglages restent trop sombres dans le thème sombre

**Observé dans l’application originale et la copie de test.**

Le curseur de taille et plusieurs icônes conservent `primary = #1f2937` sur un fond presque noir. La position du curseur et les pictogrammes deviennent difficiles à distinguer. Le problème touche précisément le réglage destiné à améliorer la lisibilité.

Source : [mobile/src/pages/settings/Index.vue](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/pages/settings/Index.vue:24). Preuve : [capture des paramètres](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/docs/audits/2026-09-09-mobile/settings-dark-360.png).

Correction proposée : utiliser une couleur de contrôle qui s’adapte au thème, avec un curseur nettement visible et une valeur numérique permanente. Étendre la vérification aux pastilles Début/Pause et aux commandes secondaires.

## Autres constats techniques à traiter

**Erreur d’initialisation graphique masquée — P2, identifié dans le code.** Le `catch` d’initialisation renseigne `sharedState.error`, puis appelle `destroyGraph`, qui le remet immédiatement à `null`. Un échec WebGL/Pixi peut donc laisser « En attente… » au lieu d’un message d’erreur, sans action de relance visible. Conserver l’erreur après le nettoyage et proposer une réinitialisation. Sources : [mobile/src/composables/use-graph/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-graph/index.ts:269), [mobile/src/composables/use-graph/index.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/composables/use-graph/index.ts:176). Aucun échec GPU réel n’a été provoqué pendant l’audit.

**Retour Android — risque à vérifier sur appareil.** Le boot ajoute son propre listener `backButton`, tandis que Quasar 2.18.6 installé ajoute aussi son gestionnaire en mode Capacitor. La configuration ne désactive pas ce dernier. Le même événement peut donc fermer un dialogue puis naviguer, ou déclencher deux retours. Ne conserver qu’un propriétaire de la navigation et tester un dialogue ouvert, une session active et le retour depuis les paramètres. Sources : [mobile/src/boot/capacitor.ts](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/src/boot/capacitor.ts:31), [mobile/node_modules/quasar/src/plugins/private.history/History.js](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/mobile/node_modules/quasar/src/plugins/private.history/History.js:87). Ce comportement natif reste à reproduire.

## Cohérence globale du produit

La structure à quatre onglets, l’accent orange, les états vides et la séparation services/repositories fournissent une base compréhensible. Les couleurs principales et le fond de repos des boutons reprennent ceux du desktop. La mutualisation des conversions et du moteur graphique est utile.

Les principales incohérences se situent dans les comportements : édition immédiate au sein d’un mode comportant une annulation, reprise de session suivie d’une correction destructrice, et promesse d’import offline sans commande correspondante. Ce sont des priorités supérieures aux ajustements purement visuels.

À harmoniser ensuite :

- Vocabulaire : « Data », « Continu (toggle) », « Graphe » et « Graphique » coexistent ; expliciter la différence entre chronique, protocole et session.
- Graphe : fond blanc imposé dans une interface sombre, libellés petits et aucune commande de zoom visible malgré les méthodes présentes. Vérifier le confort sur des observations longues.
- Contexte : le nom de la chronique et l’état d’enregistrement devraient rester identifiables lorsqu’on consulte d’autres onglets.
- Documentation : le README parle encore d’absence de compte et de relevés en lecture seule, alors que connexion cloud et commentaires sont présents.
- Assurance qualité : `mobile/package.json` expose un script `test` qui affiche seulement « No test specified » puis réussit. Les 417 tests des packages partagés ne remplacent pas des tests des parcours mobiles.

## Ordre de correction proposé

1. Préserver les sessions et les liens entre relevés et observables.
2. Garantir l’accès à chaque bouton avec une disposition responsive.
3. Rendre l’édition annulable et corriger l’overlay de recherche.
4. Exposer l’import local, améliorer les contrastes et conserver les erreurs de rendu.
5. Exécuter les scénarios corrigés sur Android et iOS : petit écran, clavier, rotation, arrière-plan, redémarrage, stockage et partage.

Résultats des sondes ciblées : [reproductions.jsonl](/home/syl/workdir/symalgo/actograph/v3/actograph-v3/docs/audits/2026-09-09-mobile/reproductions.jsonl). Le changement préexistant dans `docs/github-pages/index.html` a été laissé intact.
