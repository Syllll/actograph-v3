# Revue indépendante lead dev du mini-graphe

Date : 21 octobre 2026. Branche : `feat/live-mini-graph`. Checkout inspecté : `/tmp/actograph-mini-graph`.

Revue effectuée sur le code et les dépendances installées, sans modification du code applicatif. Les fichiers évoluent encore pendant cette revue : les constats ci-dessous décrivent l'état inspecté, puis doivent être clos après correction et nouvelle vérification.

## Verdict initial

Architecture satisfaisante pour la séparation Observation/Analyse et l'isolation de la popup. Deux corrections sont requises avant validation finale.

### P1 : destruction des objets de scène incomplète lors de la fermeture du moteur

Localisation : `packages/graph/src/pixi-app/index.ts`, `teardownPixiResources()`, notamment l'appel à `this.app.destroy()` vers la ligne 1993.

Le mini-graphe crée et détruit un moteur à chaque ouverture, changement d'onglet et transfert. Le teardown explicite détruit `overlayRoot`, les labels et le survol, mais seulement les sprites motifs du monde. Les objets `viewport`, `plot`, axes et leurs buffers de Graphics restent non détruits. Le code Pixi réellement installé confirme que `Application.destroy(rendererDestroyOptions = false, options = false)` appelle `stage.destroy(options)`. `Container.destroy(false)` retire les enfants sans appeler leur destruction. Aucun de ces objets n'est donc détruit par l'appel actuel.

Le renderer est bien détruit : cette revue ne prétend pas qu'une fuite GPU permanente a été mesurée. En revanche le contrat de libération des GraphicsContext et des buffers de scène n'est pas respecté, et des objets non détruits restent accessibles depuis l'ancien moteur ou une continuation async jusqu'à leur collecte. Ce défaut préexistant devient directement pertinent avec les cycles fréquents exigés pour cette fonctionnalité.

Correction requise : détruire les objets monde possédés, vider également les stores de couches et les buffers retirés/non commités, puis appeler la destruction profonde avec `children: true` et `context: true`. Ne pas détruire une texture partagée avec une autre instance. Préserver l'idempotence et le cas destroy pendant init. Ajouter un test où les vrais descendants ou des doubles reproduisant la sémantique Pixi sont vérifiés détruits, en plus de l'unique appel à `app.destroy`.

### P2 : le curseur sélectionné n'est pas peint sur le premier rendu réussi

Localisations : `packages/graph/src/pixi-app/index.ts`, `syncSelectedReadingMarker()` vers 1363 et fin de `executeDrawBody()` vers 1223.

`syncSelectedReadingMarker()` refuse de dessiner tant que `hasCommittedWorld` est faux. Or `executeDrawBody()` appelle `paint('draw-complete')` avant de positionner `hasCommittedWorld = true`. À l'ouverture avec un relevé déjà sélectionné, le premier draw efface ou omet donc le marqueur. Il peut apparaître seulement lors d'un present/draw ultérieur, par exemple une mise à jour live ou un mouvement de souris. Le cas est particulièrement visible pour une chronique arrêtée qui ne se rafraîchit plus.

Correction requise : rendre le monde nouvellement commité éligible au marqueur lors du present autoritaire réussi, sans permettre de present sur une scène en construction ou en échec. Tester une sélection présente avant le tout premier draw et après reprise d'un draw échoué. Le test de `MiniGraphRenderer.select()` seul ne couvre pas ce défaut.

## Points vérifiés sans constat bloquant

- Le host vit dans l'espace utilisateur et le rendu est conditionné par la route exacte `user_observation`. Une sortie Observation retire le visualiseur, ferme le transport et arrête le timer ; le retour garde seulement l'intention d'ouverture.
- Le watch synchrone `loading` couvre le début d'une requête, le rechargement de la même chronique et l'échec de chargement. Le watch id couvre aussi la fermeture/changement sans changement préalable de route.
- La popup a sa route et son canal propres. Elle ne charge aucune chronique, ne rejoint pas le bus d'autosauvegarde et reçoit des copies sérialisées. Le nom de canal porte un UUID neuf ; les snapshots sont ordonnés par révision et verrouillés sur l'id initial.
- Le renderer coalesce les snapshots, sérialise ses draws, vérifie la disposition après init et après l'await de stretch. Le composant vérifie sa génération après import asynchrone. La destruction invalide le renderer avant de détruire le moteur.
- Le protocole est copié avant toute hydratation Pixi. La fin provisoire est synthétique, limitée aux sessions ouvertes et au runtime valide, et ne réduit pas le domaine avant un relevé réel lors d'un retour vidéo.
- Les préférences sont lues depuis les données, sans importer le singleton Analyse. Sélection et survol ont des overlays distincts.
- Déplacement et redimensionnement sont bornés, avec géométrie locale validée, et existent aussi au clavier.

## Points complémentaires à vérifier avant clôture

L'agent principal corrige déjà les gestes toujours actifs après sortie Observation, les exceptions de création de canal et les reconstructions provoquées par une sélection seule dans la popup. Vérifier leur présence dans le diff final et les tests associés.

La fermeture par heartbeat utilise 8 secondes : vérifier en fenêtre système qu'une minimisation du parent ou une sortie de veille n'entraîne pas une réintégration intempestive par throttling des timers. Ce point n'a pas été reproduit durant cette revue statique et reste une vérification UI complémentaire.

Les captures et parcours UI sont réalisés par l'agent principal. Cette revue ne les présente pas comme exécutés ici. Les tests annoncés verts ne remplacent pas le test de destruction profonde ci-dessus.

## Contre-revue après corrections P1 et P2

Les deux corrections demandées sont présentes : `graphEngine.clearAll()` libère les objets suivis et retirés des couches avant la destruction profonde `app.destroy(false, PIXI_DESTROY_OWNED)` ; le premier present autoritaire passe `committingWorld` au marqueur. Les protections init tardif et idempotence sont conservées. Les tests dédiés couvrent ces contrats. P1 et P2 sont clos sur le code inspecté.

L'optimisation popup `dataVersion` est cohérente : seule la reconstruction d'un snapshot de données incrémente cette valeur. Une sélection seule conserve la version et le récepteur réutilise l'objet `observation` précédent. Le watch de données du viewer ne se déclenche donc pas ; le watch sélection ne fait qu'un present. Le snapshot complet est encore sérialisé sur le canal lors d'une sélection, ce qui peut être optimisé ultérieurement si une mesure le justifie, mais il n'y a plus de rebuild Pixi inutile.

### Recommandation pour les libellés rognés dans une petite vue

Constat fourni par le parcours UI : les labels inclinés de l'axe X débordent du mini-graphe. La cause est confirmée par le code : le fit considère `yAxis.getRequiredHeight()` alors que les labels sont reprojetés dans `AxisLabelOverlay` avec une taille constante en pixels écran. Remplacer simplement cette hauteur par `getRequiredCanvasHeight()` est insuffisant pour les grands graphes : la marge ajoutée comme dimension monde serait réduite par le zoom uniforme, contrairement au texte.

Correction sûre recommandée : une option de fit avec réserve écran, activée uniquement pour les instances du mini-graphe. L'Analyse conserve son comportement par défaut. Calculer la place utile du plot en retirant des marges en pixels écran, puis appliquer exactement le même rectangle utile dans le calcul du fit et dans `clampViewport`. Sinon le clamp actuel recentre automatiquement la scène dans le canvas entier et annule la réserve obtenue par le fit.

Pour une première correction conservatrice, la réserve basse peut provenir de `xAxis.getRequiredBottomMargin()`, avec garde sur un canvas très petit. Les labels X inclinés peuvent également dépasser à droite, et les libellés Y restent larges lorsque le monde est dézoomé : prévoir les réserves droite/gauche selon les extents des descripteurs, ou au minimum les inclure dans les cas de validation. Les extents des textes sont mesurés après rotation et ancrage, puis restent en pixels écran ; seuls leurs points d'ancrage monde sont multipliés par le scale et le stretch. Le fit doit aussi tenir compte de `axisStretch.x/y` lors du calcul de la place du plot.

Tests requis : vue 640x340 avec format Auto et Full, beaucoup de catégories imposant un scale inférieur à 1, catégorie longue, stretch persisté, redimensionnement, ajustement après pan/zoom et vue Analyse inchangée sans option. Vérifier les bounds projetées réelles des labels et une capture, pas seulement une hauteur numérique de worldBounds.

## Contrôle final des dernières modifications

Verdict : **aucun défaut bloquant supplémentaire identifié dans les dernières modifications inspectées**.

- `reserveAxisLabelSpace` est une option d'initialisation désactivée par défaut, activée par le renderer du mini-graphe. Analyse conserve donc son fit précédent. La marge reste exprimée en pixels écran et le rectangle utile est partagé par fit, clamp et conservation du viewport au resize. Le fit mini tient compte du stretch persisté des deux axes.
- Le montant des marges est borné pour conserver un espace de dessin sur petit panneau. Cette correction couvre le rognage observé des libellés X ; les cas extrêmes de très longs labels ou de très nombreuses catégories restent des limites visuelles à éprouver, sans nouvelle régression bloquante démontrée ici.
- Le viewer vide ne charge pas Pixi avant le premier relevé DATA, initialise lors de son arrivée, détruit lors du retour à vide et conserve les gardes de génération en cas d'import tardif. Le test composant couvre ce cycle.
- Les corrections précédemment demandées restent présentes et la sélection popup conserve l'identité des données avec `dataVersion`.

Le rapport final distingue correctement les preuves automatisées, les parcours visuels effectués et les limites non couvertes (fenêtre native, veille, très grosses chroniques et mesure quantitative mémoire). Les suites finales annoncées par l'agent principal n'ont pas été relancées intégralement lors de ce dernier contrôle ciblé.
