# Plan d'amélioration - Interface mobile ActoGraph

**Auteur** : Sylvain Meylan  
**Date** : 2 mars 2026

> **Contexte** : Ce plan formalise les améliorations identifiées lors de l'analyse de l'interface mobile ActoGraph (version 0.0.81). Les priorités sont basées sur l'impact UX et l'effort d'implémentation.

---

## Résumé des améliorations

| # | Amélioration | Priorité | Statut |
|---|--------------|----------|--------|
| 1 | Accessibilité : aria-labels manquants | P2 | ✅ |
| 2 | Cohérence visuelle : standardiser les couleurs des dialogs | P3 | ✅ |
| 3 | UX : améliorer la visibilité des derniers relevés | P3 | ✅ |
| 4 | UX : feedback haptique sur actions critiques | P3 | ✅ |

---

## 1. Accessibilité - aria-labels manquants

**Objectif** : Améliorer l'accessibilité pour les utilisateurs de lecteurs d'écran.

**Fichiers concernés** :
- `mobile/src/pages/Index.vue` : bouton upload cloud
- `mobile/src/layouts/MainLayout.vue` : bouton paramètres (déjà présent)

**Actions** :
- [x] Ajouter `aria-label` sur le bouton upload cloud (chronique active) — déjà présent
- [x] Ajouter `aria-label` sur les boutons Fermer (CloudSyncDialog, protocol sheet)
- [x] Ajouter `aria-label` sur le bouton Protocole
- [x] Ajouter `aria-label` sur le champ recherche des relevés

---

## 2. Cohérence visuelle - Standardiser les couleurs des dialogs

**Objectif** : Harmoniser les headers des dialogs pour une meilleure cohérence.

**Convention adoptée** :
- `bg-primary` : dialogs principaux (création, modification)
- `bg-secondary` : dialogs de sélection / choix
- `bg-info` : dialogs de commentaires / annotations

**Fichiers concernés** :
- `mobile/src/pages/observation/Index.vue` : dialogs Protocole, Renommer observable, Choisir catégorie

**Actions** :
- [x] Dialog "Choisir une catégorie" : `bg-secondary` → `bg-primary` (cohérence)
- [x] Dialog "Nouvel observable" : `bg-secondary` → `bg-primary` (cohérence)
- [x] Dialog "Renommer catégorie" : `bg-info` → `bg-primary` (cohérence)
- [x] Dialog "Renommer observable" : `bg-info` → `bg-primary` (cohérence)
- [x] Garder `bg-info` pour "Nouveau commentaire" (distinction sémantique)

---

## 3. UX - Améliorer la visibilité des derniers relevés

**Objectif** : Rendre la section "Derniers relevés" plus visible sur la page Observation.

**Problème** : Le `q-expansion-item` peut être peu visible et nécessite un clic pour s'ouvrir.

**Actions** :
- [x] Remplacer par une section toujours visible (non collapse) quand des relevés existent
- [x] Limiter à 5 affichages pour éviter de surcharger
- [x] Améliorer le style visuel (badge, bordure)

---

## 4. UX - Feedback haptique sur actions critiques

**Objectif** : Améliorer le feedback tactile sur les actions importantes (démarrage/arrêt enregistrement, toggle observable).

**Fichiers concernés** :
- `mobile/src/composables/use-haptics.ts` (nouveau)
- `mobile/src/pages/observation/Index.vue`
- `mobile/src/components/DraggableCategory.vue`

**Actions** :
- [x] Créer un composable `useHaptics` pour encapsuler le feedback haptique
- [x] Ajouter `impactLight` sur les boutons Play/Pause/Stop
- [x] Ajouter `impactLight` sur les toggles observables (discret et continu)
- [x] Vérifier que le fallback web fonctionne (graceful no-op)

---

## Notes techniques

- **Haptics** : `@capacitor/haptics` est déjà installé. Le composable vérifie `Capacitor.isNativePlatform()` avant d'appeler.
- **Accessibilité** : Les aria-labels sont en français pour cohérence avec l'interface.
