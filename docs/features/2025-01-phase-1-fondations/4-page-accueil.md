# Feature #4 - Page d'accueil avec tableau de bord

**Issue GitHub** : [#4](https://github.com/Syllll/actograph-v3/issues/4)  
**Statut** : ✅ **Implémenté**

> **⚠️ IMPORTANT : Restrictions d'implémentation**
> 
> **Le header, le footer et la sauvegarde des chroniques ne font PAS partie de cette implémentation.**
> - Le header reste tel quel et ne doit pas être modifié
> - Le footer n'existe pas en tant que composant séparé
> - Le contenu prévu pour le footer sera intégré dans le bloc "Centre d'aide"
> - La sauvegarde des chroniques (Save, Save As, Autosave) n'est pas dans le scope de cette feature

## Description

En tant qu'utilisateur, je dois pouvoir voir une page d'accueil complète qui me permet de :
- Voir mon compte (identifiant, accès), le type de licence avec lequel je suis connecté (accès au détail), langue FR
- Une zone libre pour bonus (fonctions futures telles que fusion de chronique)
- Voir la version du logiciel et la disponibilité d'une mise à jour
- Le check des mises à jour devrait se faire en arrière-plan sans bloquer les fonctions
- Afficher le nom de la chronique en cours
- Boutons : New ; Load ; (Bonus : "Fusionner" des chroniques)
- Voir l'historique des dernières chroniques manipulées, avec chargement de l'une d'elle possible
- Consulter mes onglets fonctionnels (en colonne à gauche par exemple ?) : Accueil (chap0) - Protocole (Chap 1), observations (chap 2), graph (chap 3), stats (chap 4)

**À tout moment, il est possible de naviguer entre ces onglets**, mais Graph et Stats restent grisés s'il n'y a pas encore de relevés.

- Indicateur Warning "!" : précise la raison pour laquelle Graph ou Stats ne sont pas encore accessibles

### Bonus (zones à prévoir) :
- Chargement de protocoles exemples, dont le protocole par défaut café (par la suite : parcours prof)
- Accès à une aide interactive résidente et/ou en ligne
- Accès au Cloud perso de Mon compte
- Lien vers le site ActoGraph.io, Infos actualité, FAQ
- Petit menu avec diverses options : préférences, affichage etc.

---

## État actuel du projet

### Ce qui existe déjà

✅ **Page d'accueil basique** (`front/src/pages/userspace/home/Index.vue`)
- Structure avec 4 blocs (2x2 grid)
- Bloc "Vos chroniques" avec composant `MyObservations` qui affiche une liste paginée des chroniques
  - ✅ Liste paginée avec recherche fonctionnelle
  - ✅ Colonnes : Nom et Date de dernière modification (`updatedAt`)
  - ✅ Tri par défaut DESC (les plus récentes en premier)
  - ✅ Clic sur une chronique pour la charger (`loadObservation`)
- Bloc "Centre d'aide" avec composant `FirstSteps` qui permet de charger un exemple
- Bloc "Chronique active" (vide pour l'instant)
- Bloc "Encart publicitaire" (vide pour l'instant)

✅ **Système de navigation**
- Drawer avec menu de navigation (`front/src/pages/userspace/_components/drawer/`)
- Menu items : Accueil, Protocole, Observation, Analyse
- Les items sont désactivés si aucune observation n'est chargée
- Bouton "Nouvelle chronique" dans le drawer

✅ **Gestion des observations**
- Composable `useObservation` (`front/src/composables/use-observation/`)
- Service `observationService` pour les appels API
- État partagé avec `currentObservation`, `loading`, etc.
- Méthodes : `loadObservation`, `createObservation`, `cloneExampleObservation`

✅ **Système de licence**
- Composant `License` dans la toolbar (`front/lib-improba/components/layouts/standard/toolbar/license/`)
- Composable `useLicense` pour gérer l'état de la licence
- Affichage du type de licence (Pro/Student)

✅ **Système de mise à jour**
- Service `systemService` pour gérer les mises à jour Electron
- Modal `UpdateModal` pour afficher les mises à jour disponibles
- Vérification en arrière-plan dans `front/src/pages/Index.vue`
- Version de l'app accessible via `process.env.APP_VERSION`

✅ **Authentification et utilisateur**
- Composable `useAuth` pour gérer l'authentification
- Informations utilisateur accessibles via `auth.sharedState.user`
- Menu utilisateur dans la toolbar avec déconnexion, préférences, etc.

✅ **Internationalisation**
- Support i18n avec `vue-i18n`
- Composable `useI18n` disponible

---

## Plan d'implémentation

### Phase 1 : Bloc "Chronique active" complet

#### 1.1 Créer le composant ActiveChronicle
**Nouveau fichier** :
- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`

**Tâches** :
- [x] Afficher le nom de la chronique active ou "Aucune chronique chargée"
  - Utiliser `observation.sharedState.currentObservation`
- [x] Afficher l'horodatage de la dernière observation
  - Utiliser le dernier reading de `observation.readings.sharedState.currentReadings`
- [x] Créer les boutons selon l'état :
  - Si chronique chargée :
    - "Charger une autre chronique" → ouvre un dialog de sélection
    - "Nouvelle chronique" → même logique que dans le drawer
  - Si aucune chronique chargée :
    - "Ouvrir une chronique existante" → ouvre un dialog de sélection
    - "Nouvelle chronique" → même logique que dans le drawer
- [x] Créer les liens de navigation :
  - Protocole (toujours actif si chronique chargée)
  - Observation (toujours actif si chronique chargée)
  - Graphe (grisé si pas de relevés, avec indicateur warning)
  - Statistiques (grisé si pas de relevés, avec indicateur warning)
- [x] Ajouter des indicateurs warning "!" pour Graph et Stats
  - Afficher un tooltip avec la raison : "Aucun relevé disponible. Veuillez d'abord enregistrer des observations."

#### 1.2 Créer un composant pour le dialog de sélection de chronique
**Nouveau fichier** :
- `front/src/pages/userspace/home/_components/active-chronicle/SelectChronicleDialog.vue`

**Tâches** :
- [x] Créer un dialog qui liste toutes les chroniques disponibles
- [x] Permettre la recherche/filtrage
- [x] Permettre la sélection d'une chronique
- [x] Charger la chronique sélectionnée via `observation.methods.loadObservation`

### Phase 2 : Navigation améliorée

#### 2.1 Améliorer le menu de navigation
**Fichiers à modifier** :
- `front/src/pages/userspace/_components/drawer/menu.ts`
- `front/src/pages/userspace/_components/drawer/Index.vue`

**Tâches** :
- [x] Ajouter un indicateur visuel pour Graph et Stats quand ils sont désactivés
- [x] Ajouter un tooltip avec la raison de désactivation
- [x] Vérifier s'il y a des relevés avant d'activer Graph et Stats
  - Utiliser `observation.readings.sharedState.currentReadings.length > 0`

### Phase 3 : Bonus et améliorations

#### 3.1 Zone libre pour fonctions futures
**Tâches** :
- [x] Créer un composant placeholder pour les fonctions futures
- [x] Prévoir l'espace dans le layout

#### 3.2 Améliorer le Centre d'aide (intégration du contenu du footer)
**Fichier à modifier** :
- `front/src/pages/userspace/home/_components/first-steps/Index.vue`

**Tâches** :
- [x] Ajouter un lien vers le didacticiel "Premiers pas"
- [x] Ajouter des liens vers la documentation, tutos, FAQ
- [x] Ajouter un lien vers le site ActoGraph.io
- [x] Ajouter les liens du footer : Mentions légales, Contact
- [x] Organiser le contenu de manière claire et accessible

---

## Fichiers créés/modifiés

### Fichiers créés

- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`
- `front/src/pages/userspace/home/_components/active-chronicle/SelectChronicleDialog.vue`

### Fichiers modifiés

- `front/src/pages/userspace/home/Index.vue` : Intégration du composant active-chronicle
- `front/src/pages/userspace/home/_components/first-steps/Index.vue` : Amélioration avec plus de liens
- `front/src/pages/userspace/_components/drawer/Index.vue` : Amélioration indicateurs
- `front/src/pages/userspace/_components/drawer/menu.ts` : Amélioration logique de désactivation
- `front/src-electron/electron-main.ts` : Ajout handler IPC `open-external`
- `front/src-electron/electron-preload.ts` : Exposition API `openExternal`

---

## Notes techniques

### Gestion de l'état
- Utiliser le composable `useObservation` existant pour l'état de la chronique active

### Internationalisation
- Utiliser `vue-i18n` pour toutes les chaînes de caractères
- Ajouter les traductions FR et ENG dans les fichiers de traduction

### Responsive
- S'assurer que la page d'accueil est responsive
- Adapter le layout pour mobile/tablette si nécessaire

### Couleurs CSS
- Utiliser `var(--primary)`, `var(--accent)`, `var(--secondary)` dans les styles SCSS
- Ne pas utiliser les couleurs Quasar (`var(--q-primary)`)

---

## Problèmes rencontrés

### Prop `outline` non supportée par `DSubmitBtn`
- **Solution** : Utilisation directe de `q-btn` avec la prop `outline` pour les boutons secondaires

### Route unique pour Graph et Stats
- **Note** : Il n'existe qu'une seule route `user_analyse` qui contient le graphique
- Les deux items de menu pointent vers la même route `user_analyse` pour l'instant

---

## Initiatives prises

### Améliorations non prévues

1. **Debounce sur la recherche** : Ajout d'un debounce de 300ms pour éviter trop d'appels API
2. **Tri automatique des relevés** : Tri décroissant pour afficher le dernier relevé en premier
3. **Reset de la recherche** : Réinitialisation automatique du champ de recherche lors de l'ouverture du dialog
4. **Scroll areas** : Ajout de `q-scroll-area` dans tous les blocs pour gérer le débordement
5. **Liens externes** : Gestion des liens vers actograph.io avec ouverture dans le navigateur externe

---

## Améliorations futures possibles

1. Route séparée pour les statistiques
2. Internationalisation complète (certains textes sont encore en dur en français)
3. Amélioration du dialog de sélection (bouton créer, actions supplémentaires)
4. Indicateurs visuels supplémentaires (badge nombre de relevés, indicateur de synchronisation)
5. Fonctionnalités d'import/export (actuellement désactivées)

