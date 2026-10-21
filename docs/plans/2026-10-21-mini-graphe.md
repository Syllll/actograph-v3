# Mini-graphe flottant de chronique

Branche : `feat/live-mini-graph`. Base : `34a93c1`. Checkout isolé : `/tmp/actograph-mini-graph`.

## Besoin et comportement

Visualiser la chronique complète pendant la saisie et les corrections. Panneau flottant déplaçable par son titre, redimensionnable, activé sur demande, détachable en fenêtre système et réintégrable. Même moteur et préférences graphiques que dans Analyse. Curseur vertical au temps du relevé sélectionné, absent sans sélection. Une session ouverte est prolongée au temps courant sans créer de relevé enregistré. Les sessions terminées gardent leur fin réelle. En vidéo, un retour en arrière ne supprime pas les relevés déjà saisis.

Le mini-graphe est réservé à l'onglet Observation. Sortir de cet onglet détruit son rendu et ferme la fenêtre détachée, tout en conservant l'intention d'ouverture pour un retour dans un panneau flottant. Analyse possède son propre moteur. Changer/fermer/recharger la chronique ferme le mini-graphe et sa fenêtre détachée : aucune vue de l'ancienne chronique ne doit subsister. La position et la taille sont mémorisées, pas l'ouverture automatique. Quitter l'espace utilisateur détruit toutes les ressources de cette fonctionnalité.

## Développements prévus

1. Contrat de données de rendu : dériver une copie normalisée de la chronique, ajouter une fin provisoire uniquement pour le rendu si une session est ouverte et possède un temps runtime valide. Préserver la chronique complète et les pauses. Tests des bornes et de la non-mutation.
2. Visualiseur Pixi autonome : instance par montage, aucune utilisation du singleton d'Analyse. Init asynchrone annulable, un seul draw en vol, mises à jour coalescées avec conservation de la dernière demande, destruction sûre pendant init/draw. Redimensionnement via ResizeObserver. Un curseur sélectionné indépendant du survol et des données. Rendu complet et ajustement à la demande.
3. Panneau flottant réservé à la route Observation : barre de titre, boutons accessibles, déplacement/redimensionnement bornés à la fenêtre, mémoire locale validée et remise à l'écran après réduction. Commande d'ouverture dans l'observation, y compris la saisie manuelle.
4. Fenêtre système : transfert de l'affichage (un seul visualiseur de mini-graphe actif), synchronisation des snapshots vivants et de la sélection, handshake de disponibilité, fermeture/réintégration, échec d'ouverture et perte du parent gérés. Les messages doivent être liés à l'instance et à la chronique pour rejeter tout snapshot tardif.
5. Cycle de vie : suspension et destruction hors onglet Observation, recréation au retour, reset synchrone lors d'un changement/fermeture/chargement, cleanup des timers/observers/écouteurs/canaux. Rejet de tout travail asynchrone périmé, aucune réinitialisation de l'instance d'Analyse.
6. Validation : tests unitaires et composants ciblés (init tardive, unmount pendant draw, coalescence, sélection, géométrie, détachement), typecheck/lint/suites frontend et graph/core. Tests UI de saisie/correction, déplacement, resize, détachement/réintégration, onglets, fermeture et rechargement. Captures réelles de l'application. Review indépendante et correction des constats, puis revérification.

## Risques à examiner par le lead dev

- Fidélité des catégories continues, fonds et frises avec fin provisoire.
- Coût d'un graphe complet : cadence de temps bornée, aucun polling quand fermé, pas d'empilement des draw.
- Snapshot popup : ne jamais recharger des données persistées plus anciennes par dessus l'état vivant.
- Destruction Pixi durant ses continuations asynchrones et indépendance des ressources GPU par instance.
- Stockage local indisponible/corrompu et géométrie sur petit écran.

## Plan de validation et preuves

Les résultats machine, les parcours réellement exercés et les limites éventuelles seront consignés dans `docs/reviews/2026-10-21-mini-graphe.md`. Les captures seront dans `docs/reviews/captures-mini-graphe/`.

Les skills imp-* référencés par l'IKB ne sont pas disponibles dans le catalogue ni aux emplacements configurés inspectés. Ce document est un plan de travail propre au dépôt, sans prétendre appliquer leurs templates. L'utilisateur a autorisé la planification, l'exécution, les tests et les corrections dans cette branche.

## Validation lead dev

Verdict : **plan validé avant implémentation**, après inspection ciblée de `PixiApp`, du singleton Analyse `useGraph`, du chargement de chronique et des fenêtres existantes.

Garde-fous obligatoires à respecter dans l'implémentation :

- L'autorisation de rendu dépend de la route Observation et du chargement terminé. Masquer par CSS ne suffit pas : démontage et destruction du visualiseur en quittant cet onglet. La fenêtre système se ferme aussi. Une intention locale peut restaurer le panneau au retour, jamais une popup automatiquement.
- Réinitialiser dès le début du chargement (`sharedState.loading = true`), avec observation synchrone, même si l'identifiant chargé reste le même ou si le réseau échoue. Observer uniquement l'id ou l'objet courant ne couvre pas le rechargement de la même chronique : `loadObservation` conserve l'ancien objet pendant la requête.
- Utiliser une identité de session du mini-graphe renouvelée à chaque ouverture/transfert/reset et un numéro de révision croissant. Toute continuation asynchrone et tout message popup vérifient ces identités. La fermeture demandée doit invalider la session avant d'appeler les APIs de fermeture.
- La popup du graphe ne doit pas exécuter le `loadObservation`/l'hydratation du `PopupView` actuel : elle consomme exclusivement les snapshots du propriétaire. Ce composant de visualisation n'a aucune autorité de mutation des relevés. Une ouverture refusée ou un handshake expiré restaure le panneau ; une perte du propriétaire efface le graphe et ferme la popup.
- Ne jamais importer `useGraph` dans le mini-graphe pour accéder aux préférences : ce composable initialise et observe le singleton Analyse. Lire les préférences persistées ou partager un module de données pur, puis instancier un `PixiApp` propre.
- Les ressources Pixi sont déjà conçues pour survivre à une destruction pendant init, mais le composant doit vérifier sa génération après chaque `await`. Un draw ne doit jamais manipuler les données d'une autre chronique. Détruire les timers, `ResizeObserver`, écouteurs pointeur, canaux et éventuelles captures de pointeur au démontage.
- La fin provisoire suit la dernière session ouverte et ne raccourcit jamais le domaine avant le dernier relevé réel lors d'un retour vidéo. Tester continus, fonds et frises, plusieurs sessions, pause, reprise, arrêt, zéro relevé et relevé sélectionné supprimé. La source ne reçoit aucune écriture de fin synthétique.

Validation exigée pour considérer le travail terminé : tests de montage/démontage rapide avec init différée, chargement de la même chronique, A vers B, sortie Observation pendant handshake/draw, retour Observation, fermeture popup, fermeture chronique et indépendance du graphe Analyse. Pour la mémoire : vérifier le nombre de canvas actifs et la destruction des instances/abonnements après plusieurs cycles, pas uniquement l'apparence d'une capture.

Améliorations facultatives : mémoriser une géométrie distincte pour panneau et popup ; proposer une poignée de resize accessible au clavier ; instrumenter temporairement les durées de draw sur une chronique volumineuse pour régler la cadence sans régression de fluidité.

## Exécution terminée

Les six développements sont livrés dans cette branche. Le lead dev a validé le plan puis clos ses deux constats après correction. La contre-revue finale ne relève aucun défaut bloquant supplémentaire. Résultats machine, parcours UI réellement exercés, captures et limites de validation sont consignés dans [le rapport final](../reviews/2026-10-21-mini-graphe.md). Les validations métier utilisateur et native multi-plateforme restent distinctes des tests effectués ici.
