# Validation du mini-graphe flottant

Branche : `feat/live-mini-graph`, checkout `/tmp/actograph-mini-graph`, base `34a93c1`.

## Résultat livré

Mini-graphe complet activable sur demande dans Observation, déplacement et redimensionnement par souris ou clavier, géométrie mémorisée et bornée à l'écran, détachement/réintégration via un canal dédié. Ligne verticale indépendante du survol au temps du relevé sélectionné. Les activités ouvertes sont prolongées au temps runtime valide avec une fin de rendu privée. Aucun relevé artificiel n'est enregistré. Un retour vidéo ne tronque pas les données réelles.

Hors Observation : moteur détruit, canal/fenêtre détachée fermés, intention d'affichage conservée pour le retour en panneau. Début de chargement (même id inclus), changement et fermeture de chronique : intention et snapshots effacés immédiatement. Aucune instance partagée avec Analyse. Une vue vide attend le premier relevé de données sans allouer Pixi.

## Review et correctifs

Le plan a été validé avant développement par une persona lead dev indépendante. Sa review du code a identifié deux défauts corrigés puis revérifiés : destruction profonde de la scène Pixi et de ses stores, et affichage du curseur dès le premier rendu autoritaire. Voir [rapport du lead dev](2026-10-21-mini-graphe-lead-review.md).

Autres améliorations : arrêt du geste lors d'une sortie d'Observation, tolérance au stockage/canal indisponible, rejet des snapshots tardifs par session et révision, absence de reconstruction Pixi pour une sélection seule dans la popup, réserve en pixels écran pour les libellés X (option propre au mini-graphe, fit et clamp cohérents), prise en compte des étirements d'axes au fit.

## Vérifications automatisées

- Frontend : `jest --runInBand`, 46 suites, 408 tests verts.
- Moteur graphique : `jest --runInBand`, 42 suites, 347 tests verts.
- Core : `jest --runInBand`, 21 suites, 174 tests verts.
- Total : 109 suites, 929 tests verts.
- `vue-tsc --noEmit -p tsconfig.vue-tsc.json` : succès.
- Lint complet frontend, `eslint --ext .js,.ts,.vue ./` : succès sans sortie d'erreur.
- Compilation TypeScript des packages core et graph : vérifiée séparément.
- `git diff --check` : succès.

Les nouveaux tests couvrent les données/fins privées, pauses et reprise multi-session, retour vidéo, dates invalides, stockage corrompu, confinement géométrique, init tardive, démontage pendant draw, coalescence du dernier snapshot, sélection sans rebuild, récupération après erreur, cinq cycles hors/dans Observation sans accumulation de timer, chargement même id, changement de chronique hors onglet, fermeture, popup orpheline, handshake et snapshots périmés, destruction profonde et place écran des libellés.

Les compteurs machine sont conservés dans [validation JSON](2026-10-21-mini-graphe-validation.json). La validation des ressources repose sur des assertions de destruction, de timers et de listeners ; aucun profilage quantitatif de heap ou de mémoire GPU n'est revendiqué.

## Parcours visuels réellement exercés

Instance dédiée : frontend sur 8492, API sur 3246, SQLite temporaire séparée de la base desktop habituelle. Connexion par le formulaire normal avec un compte fictif. Le checker embarqué du serveur dev échoue dans les dépendances installées ; seule la copie UI de test le désactive. Les contrôles TypeScript et lint ci-dessus ont été exécutés normalement sur le checkout de livraison, dont la configuration Quasar reste inchangée.

- Exemple complet : affichage du mini-graphe et des pauses.
- Déplacement à la souris : position modifiée de 616 à 286 px.
- Redimensionnement à la souris : largeur modifiée de 640 à 969 px.
- Sélection du relevé 3 : ligne verticale et conservation lors de la recréation.
- Correction Debout vers Assis : dessin mis à jour depuis le tableau.
- Trois cycles rapides Observation / Analyse : aucune présence du mini-graphe dans Analyse, retour d'un unique panneau avec même géométrie et rendu fonctionnel.
- Détachement : la page a reçu le signal prêt et retiré son visualiseur local ; sortie vers Analyse puis retour en panneau fonctionnels.
- Session démarrée, boutons Debout/Chercher, puis pause : nouveaux relevés présents, graphe vivant, aucun warning/erreur mini-graphe dans les logs de ce parcours.
- Fermeture de chronique via confirmation : panneau disparu ; chargement de Faire le café puis Observation : commande à faux et aucun panneau avant activation explicite.
- Nouvelle chronique : catégories et relevés corrects, aucune donnée résiduelle de l'exemple précédent.
- Redimensionnement et déplacement au clavier, puis Ajuster : graphe complet et libellés lisibles dans le panneau compact.

## Captures

- [Vue flottante et sélection](captures-mini-graphe/01-flottant-selection.jpg)
- [Analyse sans mini-graphe](captures-mini-graphe/02-analyse-sans-mini-graphe.jpg)
- [Correction d'un relevé](captures-mini-graphe/03-correction-releve.jpg)
- [Session en direct puis pause](captures-mini-graphe/04-session-en-direct.jpg)
- [Autre chronique et format compact](captures-mini-graphe/05-format-compact.jpg)

## Limites explicites

L'outil navigateur ne donne pas accès visuel à la fenêtre système enfant : aucune capture native ni inspection des contrôles de fenêtre système n'est revendiquée. Le protocole de détachement a répondu dans le parcours parent ; ouverture bloquée, fermeture, réintégration et perte du parent sont testées automatiquement. La minimisation/sortie de veille, le comportement natif Windows/macOS et les chroniques de très grande taille restent à éprouver dans l'application Electron distribuée. Le build installateur Electron complet n'a pas été exécuté.
