# Plan d'implémentation - Intégration vidéo

## Résumé

Feature permettant d'intégrer une vidéo dans la page Readings avec un mode "chronomètre" où les dates sont présentées comme des durées depuis un t0 fixe (9 février 1989).

## Checklist des tâches

### Phase 1 : Infrastructure de base - Mode chronomètre
- [ ] Ajouter l'état du mode chronomètre dans le composable observation
- [ ] Créer un composable pour gérer les durées (formatage, parsing, conversion)

### Phase 2 : Composant vidéo et intégration
- [ ] Créer le composant VideoPlayer avec redimensionnement et contrôles
- [ ] Intégrer le composant vidéo dans la page Readings
- [ ] Ajouter la sélection de fichier vidéo

### Phase 3 : Mode chronomètre - Affichage et édition
- [ ] Modifier l'affichage des dates en durées dans ReadingsTable
- [ ] Modifier l'édition pour permettre la saisie de durées

### Phase 4 : Synchronisation vidéo/observation
- [ ] Synchroniser le démarrage de la vidéo avec l'observation
- [ ] Ajouter les encoches sur la barre de défilement de la vidéo
- [ ] Synchroniser le temps de la vidéo avec elapsedTime

### Phase 5 : Persistance et améliorations
- [ ] Sauvegarder le chemin vidéo (localStorage)
- [ ] Améliorer l'UX (indicateurs, tooltips, etc.)

## Fichiers à créer

- `front/src/composables/use-duration/index.ts`
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

## Fichiers à modifier

- `front/src/composables/use-observation/index.ts`
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue` (optionnel)

## Notes techniques

- **Mode chronomètre** : t0 = 9 février 1989, conversion date ↔ durée
- **Vidéo** : HTML5 `<video>`, chemin sauvegardé en localStorage
- **Synchronisation** : vidéo.currentTime ↔ elapsedTime
- **Encoches** : une par relevé sur la timeline vidéo

