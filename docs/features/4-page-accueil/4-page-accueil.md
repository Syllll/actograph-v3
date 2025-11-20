# Issue #4 - Page d'accueil avec tableau de bord

**Lien GitHub** : https://github.com/Syllll/actograph-v3/issues/4

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

1. **Page d'accueil basique** (`front/src/pages/userspace/home/Index.vue`)
   - Structure avec 4 blocs (2x2 grid)
   - Bloc "Vos chroniques" avec composant `MyObservations` qui affiche une liste paginée des chroniques
     - ✅ Liste paginée avec recherche fonctionnelle
     - ✅ Colonnes : Nom et Date de dernière modification (`updatedAt`)
     - ✅ Tri par défaut DESC (les plus récentes en premier)
     - ✅ Clic sur une chronique pour la charger (`loadObservation`)
   - Bloc "Centre d'aide" avec composant `FirstSteps` qui permet de charger un exemple
   - Bloc "Chronique active" (vide pour l'instant)
   - Bloc "Encart publicitaire" (vide pour l'instant)

2. **Système de navigation**
   - Drawer avec menu de navigation (`front/src/pages/userspace/_components/drawer/`)
   - Menu items : Accueil, Protocole, Observation, Analyse
   - Les items sont désactivés si aucune observation n'est chargée
   - Bouton "Nouvelle chronique" dans le drawer

3. **Gestion des observations**
   - Composable `useObservation` (`front/src/composables/use-observation/`)
   - Service `observationService` pour les appels API
   - État partagé avec `currentObservation`, `loading`, etc.
   - Méthodes : `loadObservation`, `createObservation`, `cloneExampleObservation`

4. **Système de licence**
   - Composant `License` dans la toolbar (`front/lib-improba/components/layouts/standard/toolbar/license/`)
   - Composable `useLicense` pour gérer l'état de la licence
   - Affichage du type de licence (Pro/Student)

5. **Système de mise à jour**
   - Service `systemService` pour gérer les mises à jour Electron
   - Modal `UpdateModal` pour afficher les mises à jour disponibles
   - Vérification en arrière-plan dans `front/src/pages/Index.vue`
   - Version de l'app accessible via `process.env.APP_VERSION`

6. **Authentification et utilisateur**
   - Composable `useAuth` pour gérer l'authentification
   - Informations utilisateur accessibles via `auth.sharedState.user`
   - Menu utilisateur dans la toolbar avec déconnexion, préférences, etc.

7. **Internationalisation**
   - Support i18n avec `vue-i18n`
   - Composable `useI18n` disponible

### Ce qui manque

> **Note importante** : Le header, le footer et la sauvegarde des chroniques ne font PAS partie de cette implémentation. Le header reste tel quel, le contenu du footer sera intégré dans le bloc "Centre d'aide", et la sauvegarde des chroniques n'est pas dans le scope.

1. **Bloc "Vos chroniques"**
   - ✅ Liste des chroniques avec pagination et recherche (déjà implémenté)
   - ✅ Date de dernière modification affichée (déjà implémenté via `updatedAt`)
   - ✅ Chargement d'une chronique en cliquant dessus (déjà implémenté)
   - ✅ Boutons "Nouvelle chronique" et autres actions déjà bien placés dans le drawer (pas besoin de les déplacer)

2. **Bloc "Chronique active" complet**
   - Affichage du nom de la chronique chargée ou "Aucune chronique chargée"
   - Horodatage dernière observation
   - Boutons : Charger une autre chronique / Ouvrir une chronique existante
   - Boutons : Nouvelle chronique
   - Liens de navigation dans la chronique : Protocole, Observation, Graphe, Statistiques
   - Graphe et Stats cachés/grissés s'il n'y a pas de relevés
   - Indicateur Warning "!" avec raison d'inaccessibilité

3. **Navigation améliorée**
   - Indicateurs visuels pour Graph et Stats (grisés si pas de relevés)
   - Messages d'avertissement explicites

---

## Plan d'implémentation

> **Note importante** : Le header, le footer et la sauvegarde des chroniques ne font PAS partie de cette implémentation. Le header reste tel quel, le contenu du footer sera intégré dans le bloc "Centre d'aide", et la sauvegarde des chroniques n'est pas dans le scope.

> **Note** : Le bloc "Vos chroniques" est déjà fonctionnel avec liste paginée, recherche et chargement. Les boutons d'action sont bien placés dans le drawer et n'ont pas besoin d'être déplacés.

### Phase 1 : Bloc "Chronique active" complet

#### 1.1 Créer le composant ActiveChronicle
**Nouveau fichier** :
- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`

**Tâches** :
- [ ] Afficher le nom de la chronique active ou "Aucune chronique chargée"
  - Utiliser `observation.sharedState.currentObservation`
- [ ] Afficher l'horodatage de la dernière observation
  - Utiliser le dernier reading de `observation.readings.sharedState.currentReadings`
- [ ] Créer les boutons selon l'état :
  - Si chronique chargée :
    - "Charger une autre chronique" → ouvre un dialog de sélection
    - "Nouvelle chronique" → même logique que dans le drawer
  - Si aucune chronique chargée :
    - "Ouvrir une chronique existante" → ouvre un dialog de sélection
    - "Nouvelle chronique" → même logique que dans le drawer
- [ ] Créer les liens de navigation :
  - Protocole (toujours actif si chronique chargée)
  - Observation (toujours actif si chronique chargée)
  - Graphe (grisé si pas de relevés, avec indicateur warning)
  - Statistiques (grisé si pas de relevés, avec indicateur warning)
- [ ] Ajouter des indicateurs warning "!" pour Graph et Stats
  - Afficher un tooltip avec la raison : "Aucun relevé disponible. Veuillez d'abord enregistrer des observations."

#### 1.2 Créer un composant pour le dialog de sélection de chronique
**Nouveau fichier** :
- `front/src/pages/userspace/home/_components/active-chronicle/SelectChronicleDialog.vue`

**Tâches** :
- [ ] Créer un dialog qui liste toutes les chroniques disponibles
- [ ] Permettre la recherche/filtrage
- [ ] Permettre la sélection d'une chronique
- [ ] Charger la chronique sélectionnée via `observation.methods.loadObservation`

---

### Phase 2 : Navigation améliorée

#### 2.1 Améliorer le menu de navigation
**Fichier à modifier** :
- `front/src/pages/userspace/_components/drawer/menu.ts`
- `front/src/pages/userspace/_components/drawer/Index.vue`

**Tâches** :
- [ ] Ajouter un indicateur visuel pour Graph et Stats quand ils sont désactivés
- [ ] Ajouter un tooltip avec la raison de désactivation
- [ ] Vérifier s'il y a des relevés avant d'activer Graph et Stats
  - Utiliser `observation.readings.sharedState.currentReadings.length > 0`

---

### Phase 3 : Bonus et améliorations

#### 3.1 Zone libre pour fonctions futures
**Tâches** :
- [ ] Créer un composant placeholder pour les fonctions futures
- [ ] Prévoir l'espace dans le layout

#### 3.2 Améliorer le Centre d'aide (intégration du contenu du footer)
**Fichier à modifier** :
- `front/src/pages/userspace/home/_components/first-steps/Index.vue`

**Tâches** :
- [ ] Ajouter un lien vers le didacticiel "Premiers pas"
- [ ] Ajouter des liens vers la documentation, tutos, FAQ
- [ ] Ajouter un lien vers le site ActoGraph.io
- [ ] Ajouter les liens du footer : Mentions légales, Contact
- [ ] Organiser le contenu de manière claire et accessible

---

## Structure des fichiers à créer/modifier

### Nouveaux fichiers

```
front/src/
├── pages/userspace/home/_components/
│   └── active-chronicle/
│       ├── Index.vue
│       └── SelectChronicleDialog.vue
```

### Fichiers à modifier

```
front/src/
├── pages/userspace/home/
│   └── Index.vue (intégrer le composant active-chronicle)
├── pages/userspace/home/_components/
│   └── first-steps/
│       └── Index.vue (améliorer avec plus de liens)
└── pages/userspace/_components/drawer/
    ├── Index.vue (améliorer indicateurs)
    └── menu.ts (améliorer logique de désactivation)
```

---

## Priorités

### Priorité haute (MVP)
1. Phase 1 : Bloc "Chronique active" complet
2. Phase 2 : Navigation améliorée

### Priorité moyenne
3. Phase 3.2 : Améliorer le Centre d'aide (intégration du contenu du footer)

### Priorité basse (bonus)
4. Phase 3.1 : Zone libre pour fonctions futures

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

