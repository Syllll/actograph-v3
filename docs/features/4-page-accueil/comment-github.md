## 📋 Plan d'implémentation - Ce qui reste à faire

> **Note importante** : Le header, le footer et la sauvegarde des chroniques ne font PAS partie de cette implémentation. Le bloc "Vos chroniques" est déjà fonctionnel et n'a pas besoin d'être modifié.

---

## ✅ Priorité haute (MVP)

### Phase 1 : Bloc "Chronique active" complet

#### 1.1 Créer le composant ActiveChronicle
**Nouveau fichier** : `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`

**Tâches** :
- [ ] Afficher le nom de la chronique active ou "Aucune chronique chargée"
  - Utiliser `observation.sharedState.currentObservation`
- [ ] Afficher l'horodatage de la dernière observation
  - Utiliser le dernier reading de `observation.readings.sharedState.currentReadings`
- [ ] Créer les boutons selon l'état :
  - Si chronique chargée : "Charger une autre chronique" + "Nouvelle chronique"
  - Si aucune chronique : "Ouvrir une chronique existante" + "Nouvelle chronique"
- [ ] Créer les liens de navigation : Protocole, Observation, Graphe, Statistiques
- [ ] Graphe et Stats grisés si pas de relevés, avec indicateur warning "!"
- [ ] Tooltip avec raison : "Aucun relevé disponible. Veuillez d'abord enregistrer des observations."

#### 1.2 Créer le dialog de sélection de chronique
**Nouveau fichier** : `front/src/pages/userspace/home/_components/active-chronicle/SelectChronicleDialog.vue`

**Tâches** :
- [ ] Dialog qui liste toutes les chroniques disponibles
- [ ] Recherche/filtrage
- [ ] Sélection et chargement d'une chronique via `observation.methods.loadObservation`

#### 1.3 Intégrer le composant
**Fichier à modifier** : `front/src/pages/userspace/home/Index.vue`
- [ ] Intégrer le composant `ActiveChronicle` dans le bloc "Chronique active"

---

### Phase 2 : Navigation améliorée

**Fichiers à modifier** :
- `front/src/pages/userspace/_components/drawer/menu.ts`
- `front/src/pages/userspace/_components/drawer/Index.vue`

**Tâches** :
- [ ] Indicateur visuel pour Graph et Stats quand désactivés
- [ ] Tooltip avec raison de désactivation
- [ ] Vérifier s'il y a des relevés avant d'activer Graph/Stats
  - Utiliser `observation.readings.sharedState.currentReadings.length > 0`

---

## 📌 Priorité moyenne

### Phase 3.2 : Améliorer le Centre d'aide

**Fichier à modifier** : `front/src/pages/userspace/home/_components/first-steps/Index.vue`

**Tâches** :
- [ ] Ajouter lien vers didacticiel "Premiers pas"
- [ ] Ajouter liens vers documentation, tutos, FAQ
- [ ] Ajouter lien vers le site ActoGraph.io
- [ ] Ajouter liens Mentions légales et Contact
- [ ] Organiser le contenu de manière claire et accessible

---

## 🎁 Priorité basse (bonus)

### Phase 3.1 : Zone libre pour fonctions futures

**Tâches** :
- [ ] Créer un composant placeholder pour les fonctions futures
- [ ] Prévoir l'espace dans le layout

---

## 📁 Résumé des fichiers

**À créer** (2 fichiers) :
- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`
- `front/src/pages/userspace/home/_components/active-chronicle/SelectChronicleDialog.vue`

**À modifier** (4 fichiers) :
- `front/src/pages/userspace/home/Index.vue`
- `front/src/pages/userspace/home/_components/first-steps/Index.vue`
- `front/src/pages/userspace/_components/drawer/Index.vue`
- `front/src/pages/userspace/_components/drawer/menu.ts`

**Total** : 6 fichiers (2 nouveaux + 4 modifications)

---

## 🔧 Notes techniques

- Utiliser le composable `useObservation` existant pour l'état de la chronique active
- Utiliser `vue-i18n` pour toutes les chaînes de caractères
- S'assurer que la page d'accueil est responsive

