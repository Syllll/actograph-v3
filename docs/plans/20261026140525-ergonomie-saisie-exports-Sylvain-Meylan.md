# Ergonomie de la saisie et des exports : plan d'implémentation

Date : 26 octobre 2026, Europe/Paris. Rédaction : Codex pour Sylvain Meylan.

**État : lots A à H implémentés sur `feat/ergonomie-saisie-exports`, créée depuis `main` au commit `a4ed44a`. Validation technique terminée ; recette native Windows/macOS et packaging non exécutés.**

Résultats et captures : [compte rendu du 26 octobre](../reviews/2026-10-26-ergonomie-saisie-exports.md).

Mise à jour du 27 octobre 2026, autorisée par Sylvain après revue des demandes de Valérie et de Laurent : le lot B remplace le + interligne par un + permanent près du crayon ; le lot D évite les collisions de couleurs automatiques. Les captures du 26 octobre conservent la trace du prototype précédent.

Source : retour de Laurent Van Belleghem du 26 octobre, confronté au code de `main`, commit `a4ed44a`. L'analyse initiale était fondée sur les sources. L'implémentation a ensuite été vérifiée par tests automatisés et par des essais Chromium des composants et du moteur graphique ; ces essais ne constituent pas une recette complète dans Electron. La modification préexistante de `front/yarn.lock` est hors périmètre.

## Objectif et périmètre

Faciliter une journée de saisie manuelle, la relecture des relevés et leur restitution dans un document ou une présentation. Conserver les composants, les actions métier et l'organisation actuelle d'Actograph.

| Besoin du retour | Lot |
| --- | --- |
| Supprimer les chroniques d'essai depuis l'accueil | A |
| Garder le + au-dessus des libellés | B |
| Ajouter un + sur chaque ligne | B |
| Choisir les observables par catégories côte à côte | C |
| Repérer les catégories par couleur dans les libellés | D |
| Remonter les derniers relevés dans la zone de travail | E |
| Régler la taille du texte des deux axes | F |
| Régler l'orientation du texte en abscisse | F |
| Retrouver le dernier dossier choisi pour l'export | G |
| Choisir un fond transparent pour le PNG | H |

Hors périmètre : remplacement du protocole d'une chronique déjà renseignée, annulation/rétablissement global, refonte du mode de collecte, modification des statistiques et compatibilité d'édition détaillée dans toutes les versions de PowerPoint. La variante consistant à remplacer un protocole avant toute saisie pourra faire l'objet d'un petit lot distinct ; elle n'est pas nécessaire aux dix demandes ci-dessus.

## Principes UX et intégration au projet

- Garder la structure Observation : plateau des catégories à gauche, relevés à droite, séparateur redimensionnable. Les commandes des relevés restent attachées à leur table.
- Employer les composants `DPage`, `DCard`, les composants partagés de `lib-improba` et les contrôles Quasar déjà utilisés. Conserver `defineComponent` avec `setup()`, les icônes existantes et les traductions FR/EN.
- Réutiliser les couleurs sémantiques de `front/src/css/_colors.scss`. L'orange reste un accent d'interaction ; les repères de catégorie ont leur propre signification.
- Conserver un texte lisible, des libellés d'action explicites, le focus visible et des commandes utilisables au clavier. La couleur complète les noms de catégorie et ne devient pas leur seul identifiant.
- Mutualiser chaque comportement : une seule logique d'ajout, un seul sélecteur d'observable, une seule résolution des repères de catégorie, une seule chaîne d'export.
- Séparer les réglages transportables avec une chronique, tels que les axes, des préférences de la machine, telles que le dossier d'export.
- Préserver les horodatages à la milliseconde, les brouillons invalides, les identités `id`/`tempId`, le tri d'affichage, la sélection et les mécanismes existants de synchronisation entre fenêtres.

## A. Supprimer une chronique depuis les listes

**Existant.** Les listes récentes et complètes permettent seulement l'ouverture. Le client expose déjà `observationService.delete(id)` et l'API dispose d'une route de suppression avec contrôle du propriétaire et suppression des entités liées.

**Choix UX.** Ajouter un menu trois points en fin de ligne dans les deux listes, contenant « Supprimer la chronique… ». Le menu reste accessible au clavier et son clic n'ouvre pas la chronique. Une confirmation nomme la chronique et précise le périmètre : suppression de la bibliothèque locale, conservation des fichiers exportés et des copies cloud. Aucun bouton d'annulation après suppression n'est affiché en l'absence de restauration réelle.

**Travail prévu.**

1. Ajouter l'action partagée dans `use-chronicle-actions`, en réutilisant la route existante et les dialogues du projet. Ne pas dupliquer le traitement dans les deux listes.
2. Garder la ligne visible et désactiver l'action pendant la requête ; retirer la ligne et mettre à jour les compteurs après réussite seulement. En cas d'échec, conserver l'état et afficher l'erreur.
3. Pour la chronique active, coordonner la synchronisation des relevés, l'autosave, la fermeture des panneaux et des fenêtres détachées avant la suppression. Éviter qu'un travail en vol réécrive une chronique supprimée. Refuser la suppression pendant une collecte active ou en pause avec un message invitant à terminer la session.
4. Après suppression de la chronique active, revenir à l'accueil sans chronique chargée. Rafraîchir listes récentes, recherche complète et sélection. Rejeter les réponses tardives relatives à une autre chronique.
5. Vérifier la cohérence de la suppression existante avec ses entités liées. Si l'exposition de ce parcours révèle une suppression partielle sur erreur, corriger la transaction dans ce même lot.

**Fichiers principaux.** `front/src/pages/userspace/home/_components/my-observations/{Index,AllChroniclesDialog}.vue`, `front/src/composables/use-chronicle-actions/index.ts`, `front/src/composables/use-observation/index.ts`, `front/src/composables/use-autosave/index.ts`. Vérifications API dans `api/src/core/observations/controllers/observation.controller.ts` et `services/observation/index.service.ts`.

**Acceptation.** Supprimer un essai fermé puis la chronique active fonctionne depuis les deux listes ; annuler ne modifie rien ; une erreur conserve la ligne ; aucune écriture tardive ne recrée l'élément ; les exports et la copie cloud restent disponibles.

## B. Ajouter une ligne au bon endroit

**Existant.** `addManualReading()` copie la sélection, sinon le dernier relevé, puis sélectionne la nouvelle ligne. L'insertion après une source explicite existe dans `addReading(options, insertAfter)`. Le + est actuellement dans la barre d'outils, à distance de la colonne Libellé.

**Choix UX révisé le 27 octobre.** Garder le + principal dans l'en-tête fixe de la colonne Libellé. Placer un seul + local, toujours visible, dans la colonne d'actions juste avant le crayon, conformément à la demande de Laurent. L'infobulle indique « Ajouter une ligne à partir de ce relevé ». Retirer le + interligne, sa gouttière et les états de visibilité associés.

La cible locale mesure au moins 24 × 24 pixels CSS, sans recouvrir les champs éditables. Le bouton natif reste accessible à la souris, au clavier et au tactile. Les touches Inser et + sur une ligne focalisée restent disponibles. Le + local utilise explicitement le relevé de sa ligne ; le + d'en-tête conserve la règle sélection, puis dernier relevé.

**Travail prévu.**

1. Étendre `addManualReading` avec une source optionnelle explicite, sans modifier temporairement la sélection pour lui faire choisir sa source.
2. Brancher les deux points d'entrée sur cette méthode ; conserver les règles existantes pour les bornes START/STOP/PAUSE et le parcours manuel.
3. Valider le brouillon du champ quitté avant de copier. Si le champ contient une valeur invalide, garder la saisie et son message d'erreur au lieu de perdre le brouillon ou de dupliquer silencieusement une ancienne valeur.
4. Retirer le + de l'ancienne barre d'outils. Préserver son rôle pour recherche, commentaires et autres actions.
5. Après insertion, sélectionner la nouvelle ligne et placer le focus sur son horodatage. Ne pas déclencher le clic de la ligne source depuis le bouton.
6. Respecter le tri d'affichage. Si un filtre masque le nouveau relevé, le signaler avec une action explicite pour effacer le filtre, sans modifier silencieusement la recherche.
7. Vérifier les trois actions +, crayon et suppression sur panneau étroit et large. Conserver les hauteurs de ligne et les mesures du virtualiseur ; retirer l'ancien espace réservé à l'interligne. Contrôler la source après défilement et recyclage d'une ligne, ainsi que l'activation par Entrée, Espace et contact tactile.
8. Vérifier la compréhension avec un tri décroissant, des dates identiques et un filtre : la commande crée une copie à partir de la source explicite, sans inventer un horaire entre les deux lignes visibles. Les voisins visibles peuvent masquer d'autres relevés ; la nouvelle ligne peut ensuite changer de place si son heure est modifiée. Ne pas modifier silencieusement le tri pour conserver artificiellement une position.

**Fichiers principaux.** `front/src/composables/use-observation/use-readings.ts`, `front/src/pages/userspace/observation/_components/readings-side/{Index,ReadingsToolbar,ReadingsTable,ReadingTimeInput}.vue`.

**Acceptation.** L'ajout fonctionne sur une ligne ancienne, sur la dernière ligne et sans sélection ; le + local utilise bien sa propre ligne ; le temps, le nom, les notes et les règles de type sont préservés ; le focus suit la nouvelle identité avant et après attribution d'un ID serveur. Les deux accès restent visibles et utilisables au clavier et au tactile. Aucun bouton interligne ne subsiste. La cible locale reste confortable, sans changement de hauteur ni clic parasite dans un champ ; le panneau étroit conserve un accès aux actions par défilement horizontal si nécessaire. La recette métier reste à effectuer dans l'application native.

**Référence et limites.** Dans la v1 disponible, un principe d'ajout entre éléments est présent dans `v1/actograph/Gui/Observation/Buttons/AddArea/ObsAddArea.qml`, pour les observables du protocole. Le tableau des relevés consulté, `Gui/Observation/Data/DataArea.qml`, utilise un + dans sa barre d'outils ; la variante exacte décrite par Sylvain n'y est pas confirmée. Pour la taille de cible et l'accès au clavier, voir les explications W3C sur [la taille minimale des cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) et [l'accès clavier](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-accessible.html). Ces références ne remplacent pas la vérification de la géométrie réelle et des usages dans Actograph.

## C. Un sélecteur d'observable commun, organisé par catégories

**Existant.** Le menu dans la cellule et le sélecteur de la modale d'édition présentent chacun une liste verticale groupée. La saisie libre et l'autocomplétion sont déjà possibles.

**Choix UX.** Le menu ouvert depuis la cellule montre une colonne par catégorie, avec le titre au-dessus et les observables en dessous, dans l'ordre du protocole. Les colonnes reviennent à la ligne selon la largeur disponible. Le panneau s'ouvre vers l'intérieur de la fenêtre, conserve une hauteur maximale et un défilement commun. La recherche existante de la modale est conservée ; aucune nouvelle barre permanente n'est ajoutée au tableau.

**Travail prévu.**

1. Extraire le contenu commun dans un composant `ObservablePicker.vue`, propre au domaine Observation. Sa valeur reste le nom d'observable utilisé par les relevés actuels.
2. Réutiliser ce composant depuis la flèche de cellule et depuis le champ Libellé de `EditReadingDialog`, en conservant la saisie libre et son filtrage.
3. Afficher le nom de la catégorie, son repère coloré et la sélection courante. Permettre les noms longs sans élargir le panneau au-delà de la fenêtre ; conserver un accès au libellé complet.
4. Gérer Tab, Entrée, Espace, Échap, le retour du focus au déclencheur et la sélection au clavier. Cliquer un observable ne modifie que le libellé et les informations déjà prévues par l'édition actuelle.
5. Garder un rendu compact à une colonne sur fenêtre étroite. Pour beaucoup de catégories, utiliser le même panneau défilant plutôt qu'une succession de sous-menus.

**Fichiers principaux.** Nouveau composant sous `front/src/pages/userspace/observation/_components/readings-side/`, `ReadingsTable.vue`, `EditReadingDialog.vue`. Modèle de groupes commun dans un utilitaire voisin si nécessaire.

**Acceptation.** Les deux points d'entrée présentent le même protocole ; les catégories vides et les filtres sans résultat sont compréhensibles ; la saisie libre reste possible ; aucune donnée temporelle ni note ne change lors du choix d'un observable.

## D. Repérer les catégories dans la liste des relevés

**Choix UX.** Ajouter une petite pastille ou un trait coloré dans la cellule Libellé, avec une teinte très légère en complément si elle reste lisible. Le texte conserve une couleur contrastée. Au survol ou au focus, l'information accessible indique « Catégorie : … ». L'état de sélection et l'erreur de libellé inconnu gardent leur priorité visuelle.

**Travail prévu.**

1. Construire un index réactif nom d'observable vers catégorie, partagé avec le sélecteur. En présence d'homonymes hérités, utiliser un état neutre plutôt qu'une association arbitraire.
2. Réutiliser la couleur graphique explicite de la catégorie lorsqu'elle existe et la réserver avant d'attribuer les couleurs automatiques. Pour celles-ci, utiliser les IDs dans un ordre déterministe afin d'éviter les collisions, y compris lorsque la palette initiale est épuisée, tout en conservant la stabilité à la réouverture, au renommage et au réordonnancement. Les labels restent nécessaires pour identifier les catégories dans les grands protocoles. Les catégories anciennes sans ID restent neutres.
3. Appliquer la même résolution dans le sélecteur et les cellules. Cette couleur identifie la catégorie ; une éventuelle couleur propre à un observable continue de décrire sa série graphique.
4. Ne pas écrire de couleurs dans le protocole à sa simple lecture et ne pas recolorer implicitement les graphiques historiques. Une personnalisation graphique existante reste prioritaire sur la palette de secours.
5. Garder les commentaires, événements de session et observables inconnus dans leurs traitements actuels. Éviter un parcours complet du protocole pour chaque cellule à chaque rendu.

**Fichiers principaux.** `ReadingsTable.vue`, `ObservablePicker.vue`, nouvel utilitaire de résolution des catégories ; réutilisation de `front/src/services/observations/protocol-graph-preferences.utils.ts`.

**Acceptation.** Les repères suivent les changements du protocole, restent stables après un tri ou une réouverture, et demeurent lisibles en thème clair et sombre. Les erreurs restent identifiables sans interpréter une couleur de catégorie.

## E. Pouvoir remonter les dernières lignes

**Existant.** La table est virtualisée. Elle appelle déjà `scrollTo(index, 'center')` lors d'un changement de sélection, mais ne réserve pas d'espace de travail après le dernier relevé. Le `QTable` installé expose le slot `bottom-row`, y compris dans son chemin virtualisé.

**Choix UX.** Permettre de faire défiler la dernière ligne jusqu'en haut de la zone de lecture, sous l'en-tête fixe. À l'ajout, centrer le relevé dans la zone visible et attendre la fin du rendu virtuel avant de focaliser son horodatage. Un simple clic dans une ligne déjà visible ne doit plus provoquer un recentrage intempestif.

**Travail prévu.**

1. Ajouter un espace terminal de présentation avec `bottom-row`, dimensionné à partir de la hauteur visible du tableau, de l'en-tête et d'une ligne. Cet espace ne constitue jamais un relevé et ne participe ni aux compteurs, ni au tri, ni aux exports.
2. Employer un `ResizeObserver` nettoyé au démontage pour recalculer cet espace lors d'un redimensionnement de fenêtre ou de panneau.
3. Séparer le défilement demandé après insertion, le défilement nécessaire pour rendre une sélection externe visible et la sélection locale par clic. Ne pas réagir à une simple attribution d'ID en déplaçant la vue.
4. Vérifier l'intégration au calcul réel du virtualiseur Quasar avant de finaliser le réglage de l'espace ; conserver le slot public et éviter les modifications de `node_modules`.

**Fichiers principaux.** `ReadingsTable.vue`, `readings-side/Index.vue`, coopération avec le focus et l'insertion du lot B.

**Acceptation.** Sur 500 relevés, la dernière ligne peut être amenée sous l'en-tête ; les clics et la frappe ne font pas sauter la vue ; l'ajout et la sélection depuis le mini-graphe rendent la cible visible ; une réduction de fenêtre conserve une table utilisable.

## F. Taille et orientation du texte des axes

**Existant.** Le graphe possède un menu de réglage de l'échelle. Le texte des axes vaut 12 px et l'angle X est fixé à 45°. Plusieurs calculs de marge supposent cet angle. Les préférences de graphe sont déjà transportées dans `observation.meta` via une file de persistance par chronique.

**Choix UX.** Étendre le menu existant et le nommer « Axes ». Il contient les réglages d'échelle actuels, « Taille du texte horizontal », « Taille du texte vertical » et « Orientation du texte horizontal ». Les tailles vont de 10 à 24 px par pas de 1, avec un retour aux valeurs par défaut. L'orientation propose « Automatique », « Horizontal », « Incliné à droite » et « Incliné à gauche », correspondant à Auto, 0°, +45° et -45°. Le rendu se met à jour pendant le réglage.

**Travail prévu.**

1. Ajouter des options de rendu nommées, par exemple `xAxisFontSize`, `yAxisFontSize`, `xAxisLabelOrientation`, dans `IGraphRenderOptions`. Normaliser les valeurs inconnues ou hors plage. Sans nouvelles métadonnées, conserver le rendu historique 12 px et +45° ; Auto reste un choix explicite.
2. Intégrer ces champs aux comparaisons d'options et à la classification des changements dans `graph-render-options.ts`. Un changement de taille ou d'angle ne doit pas emprunter le raccourci « seul le format du temps change ».
3. Propager les paramètres aux deux axes, à `AxisLabelOverlay` et aux mesures de texte. Adapter les marges basse, gauche et latérales, les ancres pour les angles négatifs, la collision des étiquettes et la hauteur d'export. Garder les tailles en pixels écran comme dans l'overlay actuel.
4. Pour Auto, mesurer les candidats avant suppression des étiquettes : choisir 0° si les textes tiennent, sinon +45°, puis appliquer la règle de collision existante. Éviter une boucle où la suppression des labels ferait changer continuellement d'orientation.
5. Persister les choix par chronique avec `observationGraphMetaPersistQueue` et `mergeMetaIfSameObservation`, en fusionnant les autres métadonnées. Ne pas laisser une réponse tardive d'une chronique écraser celle qui vient d'être ouverte.
6. Mutualiser la lecture normalisée des métadonnées avec le mini-graphe, sans importer le singleton Analyse dans son composant. Les instances conservent leur cycle de vie indépendant.
7. Appliquer les mêmes options aux exports PNG/JPEG/SVG ; recalculer Auto dans le cadrage d'export, puis restaurer le cadrage et l'état d'affichage antérieurs.

**Fichiers principaux.** `packages/graph/src/types/graph-render-options.ts`, `pixi-app/index.ts`, `pixi-app/axis/{x-axis,y-axis}.ts`, `layers/AxisLabelOverlay.ts`, utilitaires de placement ; `front/src/pages/userspace/analyse/_components/graph/{Index.vue,use-graph.ts}`, `front/src/utils/observation-meta-update.ts`, `front/src/components/mini-graph/MiniGraphViewer.vue`, normaliseur partagé de métadonnées graphiques.

**Acceptation.** Les tailles et les trois angles explicites sont visibles à l'écran et à l'export ; Auto choisit l'horizontale quand elle tient ; aucun libellé n'est coupé, notamment avec une date longue et une inclinaison négative ; les réglages survivent à la réouverture et à un export/réimport `.jchronic`.

## G. Retrouver le dernier dossier d'export

**Choix UX.** À la prochaine exportation, ouvrir la boîte native dans le dernier dossier choisi pour ce type de document. Garder deux mémoires locales : fichiers de chronique et images du graphe. PNG, JPEG et SVG du graphe partagent le même dossier. La première utilisation garde Documents/Actograph. Aucun réglage supplémentaire n'est ajouté dans l'interface.

**Travail prévu.**

1. Ajouter à `showSaveDialog` un contexte optionnel typé, limité aux exports de chronique et de graphe. Mettre à jour main, preload et la déclaration de `window.api` ensemble.
2. Isoler la résolution et la mémorisation des dossiers dans un petit module Electron, stocké dans `app.getPath('userData')`. Les chemins restent propres à l'installation et ne sont pas intégrés aux chroniques ni au cloud.
3. Priorité : un chemin absolu fourni explicitement par l'appelant, sinon le dernier dossier valide du contexte accompagné du nom proposé, sinon le dossier Actograph existant. Ne pas modifier le comportement des dialogues sans contexte, notamment les rapports d'erreur.
4. Mémoriser uniquement le dossier d'un dialogue confirmé. Une annulation ne remplace pas la préférence. En cas de dossier supprimé, support déconnecté ou fichier de préférences corrompu, revenir au défaut sans bloquer l'export.
5. Brancher le contexte dans `export.service.ts` et dans l'export d'image du graphe. Conserver la validation et l'assainissement actuels des noms de fichier.

**Fichiers principaux.** `front/src-electron/electron-main.ts`, `electron-preload.ts`, nouveau module de mémoire des dossiers ; `front/src/boot/lib-improba.ts`, `front/src/services/observations/export.service.ts`, `front/src/pages/userspace/analyse/_components/graph/Index.vue`.

**Acceptation.** Le dossier est retrouvé après deux exports et après redémarrage ; changer de format d'image le conserve ; annuler ne le change pas ; un dossier indisponible permet encore d'exporter ; un chemin explicite conserve sa priorité.

## H. PNG avec fond transparent

**Existant.** L'extraction Pixi force un fond blanc. Les canvas de légende et de composition le font également. Les exports de graphe sont déjà sérialisés et restaurent leur cadrage après capture.

**Choix UX.** Dans le menu d'export existant, ajouter « Fond transparent » uniquement lorsque PNG est sélectionné. La valeur initiale est désactivée. Le choix concerne le graphe seul, la légende seule et leur combinaison. JPEG conserve un fond blanc ; le SVG garde son comportement actuel dans ce lot.

**Travail prévu.**

1. Étendre l'API d'export avec une option de fond facultative, rétrocompatible avec les appels actuels `exportAsImage(format, quality)`. Transmettre une copie des options au démarrage de l'export pour éviter qu'un changement de contrôle modifie une capture en cours.
2. Pour PNG transparent, extraire avec un fond alpha nul dans `ExportPipeline`. Conserver les fonds de catégories, motifs et overlays de pause qui font partie de la représentation des données.
3. Passer le même choix à la génération du canvas de légende et au canvas combiné. Retirer uniquement le remplissage global blanc et les marges opaques lorsque la transparence est demandée.
4. Conserver la file d'export, la suppression temporaire du survol, les garanties de restauration du viewport et la destruction sûre pendant une capture. Ne pas changer le fond de travail de l'application.
5. Retenir le choix localement sur la machine, dans un espace dédié aux préférences d'export. Un passage temporaire à JPEG ne doit pas activer de transparence JPEG ni effacer le choix PNG.

**Fichiers principaux.** `packages/graph/src/engine/ExportPipeline.ts`, `packages/graph/src/pixi-app/index.ts`, `front/src/pages/userspace/analyse/_components/graph/Index.vue`, utilitaire local de préférences d'export si extrait.

**Acceptation.** Les pixels de marge ont un alpha nul pour les trois contenus PNG ; traits, textes et fonds sémantiques sont conservés ; les exports blancs par défaut et JPEG restent opaques ; le zoom, le cadrage et l'affichage du graphe sont restaurés, y compris après erreur.

## Ordre de réalisation

1. **Confort de saisie : B, E.** Rapprocher l'ajout, fiabiliser le focus puis le défilement. Ces deux lots partagent la gestion de la nouvelle sélection.
2. **Choix et relecture : C, D.** Construire le sélecteur commun et l'index catégorie/observable, puis appliquer les repères de couleur aux deux interfaces.
3. **Gestion et export : G, A.** Livrer les dossiers mémorisés et la suppression depuis les listes. Ces lots sont indépendants du moteur graphique.
4. **Présentation du graphe : F, H.** Ajouter les réglages d'axes, puis vérifier l'ensemble des exports avec transparence. Garder des changements séparables pour isoler une régression de rendu.

Chaque lot reste identifiable pour la revue et la validation. Aucune nouvelle dépendance ni migration de schéma de base de données n'est anticipée ; les réglages graphiques utilisent les métadonnées existantes.

## Vérifications prévues et état de validation

Les scénarios ci-dessous ont guidé les vérifications. Les résultats exécutés et leurs limites sont détaillés dans le [compte rendu](../reviews/2026-10-26-ergonomie-saisie-exports.md) : 1 094 tests passent dans quatre ensembles, les contrôles de types et de lint passent, le graphe et l'interface compilent. Les essais Chromium portent sur les vrais composants et le moteur, sans couvrir le parcours natif complet ni le packaging Electron.

### Tests automatisés ciblés

- **Suppression :** propriétaire autorisé/refusé, suppression des relations, erreur conservant la ligne, suppression active avec synchronisation ou autosave en vol, absence de contamination après changement de chronique.
- **Insertion :** source explicite différente de la sélection, source sans ID définitif, copie du contenu validé, brouillon invalide conservé, bornes de session, mode calendrier et chronomètre, tri croissant/décroissant et filtre actif. Étendre les suites existantes des relevés et de la saisie manuelle.
- **Sélecteur et couleurs :** même sélection depuis cellule/modale, saisie libre, navigation clavier, conservation temps/notes, mise à jour après renommage, homonymes hérités, repères stables après réordonnancement.
- **Défilement :** vrai `QTable` virtualisé comme dans les tests actuels, dernière ligne, insertion, attribution d'ID et sélection externe. La géométrie simulée ne remplace pas la recette réelle.
- **Axes :** normalisation des valeurs et lecture d'anciennes métadonnées, redessin à chaque option pertinente, tailles et angles dans les descripteurs, marges avec libellés longs, collisions, Auto, persistance concurrente, cadrage et export SVG.
- **Dossiers :** chemin explicite prioritaire, mémoire distincte par contexte, annulation, redémarrage, stockage corrompu et dossier disparu. Tester le module isolé plutôt que devoir démarrer Electron pour chaque cas.
- **PNG :** vérifier réellement l'alpha des pixels sur graphe, légende et combinaison, plus le rendu opaque et JPEG ; restauration après export et erreur. Un test d'argument `clearColor` seul ne suffit pas à valider le résultat.

### Contrôles de code et intégration

- Frontend : `yarn typecheck`, `yarn lint`, `yarn test --runInBand` dans `front/`.
- Graphe : `yarn test --runInBand` et `yarn build` dans `packages/graph/` ; cœur si un utilitaire ou type partagé y est modifié.
- API : `yarn test --runInBand` dans `api/` pour le lot A et toute correction de service nécessaire.
- Compilation de l'interface et packaging Electron selon le workflow du dépôt ; utiliser le runtime compatible avec le binaire SQLite local, sans changer les dépendances pour contourner l'environnement.
- Vérifier la compilation des consommateurs du graphe, dont le mobile, si l'API ou un type partagé évolue. Conserver les valeurs par défaut et les arguments existants.
- Mettre à jour `docs/desktop.md`, `docs/reading.md` et `docs/graph.md` avec les comportements livrés. Consigner les résultats et limites dans un compte rendu daté.

### Recette UX dans l'application réelle

1. Sur petit écran de portable puis grand écran, ajouter et corriger une série de relevés sans aller chercher une commande à l'autre bout du panneau.
2. Sur une chronique de 500 relevés, travailler dans les dernières lignes, trier dans les deux sens, filtrer, effacer le filtre et redimensionner le panneau. Contrôler les déplacements de focus et de défilement.
3. Choisir des observables dans plusieurs catégories, dont une catégorie longue et un gros protocole. Réaliser le même parcours au clavier et dans la modale.
4. Relire les catégories en thèmes clair et sombre, avec commentaires, erreurs, sélection et noms longs.
5. Changer de chronique pendant une sauvegarde de réglage ; ouvrir/fermer le mini-graphe et ses fenêtres. Vérifier que les choix restent attachés à la bonne chronique.
6. Exporter graphe, légende et combinaison en PNG blanc/transparent, JPEG et SVG, avec les tailles extrêmes et les deux sens d'inclinaison. Vérifier absence de rognage et retour au cadrage initial.
7. Poser le PNG transparent sur une diapositive colorée ; vérifier les marges et les détails des séries. Tester les boîtes de fichier sur Windows et macOS lorsque ces environnements sont disponibles ; rapporter explicitement un contrôle indisponible.
8. Supprimer un essai fermé puis une chronique active ; annuler une confirmation ; simuler une erreur API. Vérifier les listes, compteurs, fenêtres et fichiers déjà exportés.

## Points à surveiller

- Les métadonnées graphiques sont partagées avec d'autres préférences : les mises à jour doivent être fusionnées et ordonnées par chronique.
- Les relevés référencent les observables par nom : les anciens homonymes demandent un affichage neutre, pas une association inventée.
- Le tableau est virtualisé : conserver les brouillons et le focus lors du recyclage des lignes et de l'attribution d'un ID.
- Les marges actuelles supposent +45° : adapter le rendu et les calculs de cadrage ensemble, notamment pour les angles négatifs.
- La transparence concerne toute la composition, pas seulement l'extraction du graphe.
- La suppression exposée dans l'accueil doit coordonner les écritures et fenêtres existantes ; elle ne se réduit pas à masquer une ligne.

## Cadre documentaire

Le [workflow IKB](../../.knowledge-base/recipes/glutamat/auto-implement/index.md) renvoie aux compétences `imp-*`. `imp-plan` n'est exposé ni dans le catalogue de cette session ni dans les emplacements configurés inspectés ; son emplacement a été demandé. La règle consultée indique : « Sans emplacement connu, signaler le manque et demander l'emplacement ou une installation autorisée. »

Cette proposition conserve l'organisation documentaire du dépôt, comme le [plan du mini-graphe](2026-10-21-mini-graphe.md). Elle ne reproduit pas un template `imp-plan` supposé, ne crée pas de faux statuts de workflow et ne modifie pas le backlog. Si la compétence est fournie, appliquer son format à ce contenu au même endroit, en conservant les décisions et le périmètre. Après ce plan, Sylvain a explicitement autorisé l'implémentation sur une branche tirée de `main`, avec des sous-agents, puis le commit, le push et la préparation d'un brouillon Slack. Trois sous-agents ont travaillé sur la saisie, le graphe et les exports, avec revue croisée et intégration par l'agent principal. Cette autorisation technique ne vaut pas recette métier ni publication d'une version.
