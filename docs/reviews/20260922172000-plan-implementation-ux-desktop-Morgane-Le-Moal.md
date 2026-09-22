# Plan d’implémentation — UX desktop (recueil Morgane Le Moal)

**Auteur** : Morgane Le Moal  
**Date** : 22 septembre 2026  
**Destinataire** : Composer 2.5 (un lot = une session)  
**Application** : ActoGraph desktop, frontend Quasar / Vue 3 (`defineComponent`)  
**Source des décisions** : [20260922141500-test-manuel-desktop-Morgane-Le-Moal.md](./20260922141500-test-manuel-desktop-Morgane-Le-Moal.md)  
**Captures** : [captures-test-manuel-desktop/](./captures-test-manuel-desktop/)  
**Prompts** : [20260922172100-prompts-composer-ux-desktop-Morgane-Le-Moal.md](./20260922172100-prompts-composer-ux-desktop-Morgane-Le-Moal.md)  
**CR** : [20260922172700-cr-ux-desktop-Morgane-Le-Moal.md](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md) (un fichier, une section par lot ; Composer remplit la section, ne recrée pas)

Ce plan traduit le recueil en lots exécutables. Les IDs (H.5, P.2, …) sont la source de vérité. En cas d’écart, le recueil gagne.

---

## Contraintes (tous les lots)

- Front uniquement (**pas** d’API, voir multi-device).
- `defineComponent` + `setup()` — pas de `<script setup>`.
- Commentaires de code en anglais. i18n : **FR et en-US en parallèle**.
- Pas de nouvelle dépendance, pas de `package.json` / Docker / `.env` / CI.
- Pas de migration, pas d’entité ORM inventée.
- Réutiliser les composants existants (`DDialogCard`, `d-action-btn`, `q-tooltip`, `useChronicleNavigation`).
- Couleurs : `var(--accent)` (#f97316), `var(--primary)` (gris foncé). Ne pas compter sur `$primary` Quasar (commenté dans `front/src/css/quasar.variables.scss`) — le focus bleu actuel vient du défaut Quasar.
- Une décision du recueil, pas une réinterprétation. Si un détail UI manque : **I don’t know**, ne pas inventer.
- Ne pas implémenter un autre lot que celui demandé.
- **Multi-device** : voir la section ci-dessous. `front/` = Electron **et** web. `mobile/` et `packages/` sont hors lots.

---

## Multi-device et effets de bord

ActoGraph n’est pas un binaire desktop isolé.

| Surface | Code | Ce lot |
|---------|------|--------|
| Desktop Electron | `front/` + `process.env.MODE === 'electron'` | Cible du recueil |
| Web | **le même** `front/` | Subit tout changement i18n / CSS / page |
| Mobile Capacitor | `mobile/` + `@actograph/core` + `@actograph/graph` | **Ne pas toucher** |
| API | `api/` | Partagée par web + Electron (+ sync). Un changement de donnée touche tous les clients |

### Interdit (effet de bord)

- `mobile/`, `packages/core/`, `packages/graph/` (moteur Pixi).
- Migrations, schéma, types de relevés (`START` / `STOP` / `DATA`).
- Modifier `api/.../observation/index.service.ts` (`'Protocol - '`) : le nom stocké est lu par tous les clients et toutes les langues. **P.1 = overlay d’affichage front seulement.**
- Lever ou dupliquer les `v-if="computedState.isElectron"` du drawer (Changer de licence, Sauvegardes automatiques, Quitter).
- Changer `pauseTimer` / `stopTimer` : Pause = `pauseTimer()` (pas de Fin). Terminer = `stopTimer()` → `addStopReading()`. Pas de nouveau type de relevé.
- Raccourci Cmd/Ctrl+F **global** (vole le find du navigateur web). Le lier seulement si le champ recherche observation a le focus.
- Nouvelle clé `graphPreferences` / valeur d’enum hors `IGraphPreferences` existant (le mobile mappe `display_mode`, `color`, `background_pattern`).

### Accepté (même app web)

Les libellés i18n et le chrome userspace (drawer, Mes chroniques, protocole, observation, graphe, stats) s’appliquent aussi au **web**. C’est le même produit, pas un fork. Ne pas créer de fichier `*.electron.vue`.

### À préserver lot par lot

| Lot | Garde-fou |
|-----|-----------|
| 1 | Garder les gates Electron. Focus accent : préférer `_dialogs.scss` + userspace, pas restyler l’admin. |
| 1Bis | Déconnecté : clic icône → `openCloud()`. `@click.stop`. Ne pas modifier le contenu de `CloudLoginDialog` (H.4). |
| 3 | Titre **Protocole** en i18n sur la page. **Pas** d’écriture API. |
| 4 | `order` reste en base ; on ne l’affiche plus à l’ajout. Mobile a son propre éditeur. |
| 4Bis | Même séquence que la modale (delete + add, append). Correctif : passer `action` + `graphPreferences` dans `POST /item` (branche observable seulement). Pas d’insert. Pas `parentId` sur `EditItemDto`. Pas `mobile/` ni `packages/`. |
| 5 | Brancher Rec / Pause / Terminer sur `startTimer` / `pauseTimer` / `stopTimer` existants. |
| 6 | Bannière = composant front. Ne pas modifier `hasReadingsAfterLastStop` dans core. |
| 7 | Conserver le branchement Electron (`saveImageViaElectron`) vs téléchargement navigateur déjà en place. |
| 8 | Uniquement le drawer `front/.../graph-customization-drawer/`. Enums `DisplayMode` / `BackgroundPattern` inchangés. G.6 : ne plus **écraser** un override enfant (données déjà lues par le mobile). |

---

## Hors périmètre

| ID | Motif |
|----|--------|
| **M.1** | Garder **Exporter la chronique**. Le panneau OS « Enregistrer sous » est hors i18n. |
| **M.3** | Fusionner : inchangé. |
| **H.4** | Cloud accessible à toutes les licences. **Ne pas** ajouter de caption licence étudiante / pro dans `CloudLoginDialog`. |
| **I.1** | `APP_VERSION` au build est déjà correct. Ne pas toucher `package.json`, `quasar.config.js`, `publish.yml`, ni le « V3 » en dur. |

---

## Ordre et dépendances

```
Lot 1  Drawer (nav, cloud, compte, Dupliquer, focus accent)
  └─ Lot 1Bis  Indicateur cloud sur Mon compte (H.8)
  └─ Lot 2  Carte Mes chroniques
Lot 3  Protocole libellés / grille / CTA
  └─ Lot 4  Protocole inline + D&D
      └─ Lot 4Bis  D&D observable → autre catégorie (P.10)
Lot 5  Observation session (Rec / Pause / Terminer + chrome)
Lot 6  Observation relevés + bannière orphelins partagée
Lot 7  ExportMenu (Graphe + Stats + cartes)
  ├─ Lot 8  Graphe affichage (après Lot 7 pour le header)
  └─ Lot 9  Statistiques onglets / gouttière (après Lots 6 et 7)
```

Exécuter **dans l’ordre numérique** (1 → 1Bis → 2 …). Lots 3 et 5 peuvent démarrer après le Lot 1, mais ne pas paralléliser dans Composer : un lot à la fois.

---

## Lot 1 — Drawer : nav, cloud, compte, Dupliquer

**IDs** : H.5, H.2, H.3, M.2, M.4  
**Prompt** : `LOT-01`  
**CR** : [LOT-01](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-01)

### Décisions

- Nav + titre de page/bloc : **Mes chroniques**. Icône **`mdi-book-multiple`** (plus `home`).
- CTA cloud **orange** sous Nouvelle / Importer.
  - Déconnecté : **Se connecter au cloud**
  - Connecté : **Accéder aux chroniques cloud**
- **Envoyer vers le cloud** dans le sous-menu de la chronique ouverte, à côté d’Exporter.
- Plus de bouton cloud sur la carte chronique (Lot 2 enlève le markup ; Lot 1 retire le câblage drawer → carte si besoin).
- Bas de drawer :

```
Sauvegardes automatiques
Aide
Mon compte
  Licence étudiante
  ▾ menu dans le drawer, vers le haut
    Préférences
    Changer de licence
    Quitter
```

- Entry menu = titre de modale : **Préférences** (`drawer.preferences`). Plus de `drawer.preferencesDisplay`.

- Caption **Licence étudiante** (plus « Accès étudiant ») — barre compte H.3, **pas** une restriction cloud.
- Conserver les `v-if="isElectron"` existants (Changer de licence, Sauvegardes, Quitter). Ne pas afficher ces entrées sur le web.

- Dupliquer (comportement inchangé = export JSON + réimport) :

| Surface | Cible |
|---------|-------|
| Menu | **Dupliquer** |
| Icône | **`mdi-content-duplicate`** |
| Tooltip | **Dupliquer la chronique ouverte** |
| Titre | **Dupliquer la chronique** |
| CTA | **Dupliquer** |
| Toast | **Chronique dupliquée** / **Erreur lors de la duplication** |
| Hint | **La chronique actuelle est conservée. Cette action crée une copie indépendante.** |
| Suffixe | `(copie)` inchangé |
| Taille | `DDialogCard` **`sm`** |
| Champ | contenu dans la carte (`q-gutter-y-md`, pas `q-gutter-md` horizontal qui fait déborder) |

- Focus **accent** sur les `q-input` / `q-field` outlined **userspace + dialogs** (`_dialogs.scss` / userspace). Pas un override global qui restyle l’admin.

### Fichiers

- `front/src/pages/userspace/_components/drawer/Index.vue`
- `front/src/pages/userspace/_components/drawer/menu.ts`
- `front/src/pages/userspace/home/_components/active-chronicle/SaveAsDialog.vue`
- `front/src/composables/use-chronicle-actions/index.ts` (toasts `saveAsSuccess` / `saveAsError`)
- `front/src/i18n/fr/index.ts` et `front/src/i18n/en-US/index.ts` (`chronicle.*`, `dialogs.saveAs.*`, `drawer.*`, `licenseUi.accessStudent`, `homePage.yourChronicles`)
- `front/src/css/app.scss` (ou `_dialogs.scss`) — override focus outlined userspace + dialogs → `var(--accent)` (pas l’admin)
- `front/src/pages/userspace/home/Index.vue` — titre de bloc `yourChronicles` / `HomeTitle`

Réutiliser `d-action-btn` déjà utilisé pour Nouvelle / Importer. Ne pas modifier `export.service.ts` `saveAsObservation` (logique métier OK).

### Captures

`accueil-02`, `accueil-03`, `accueil-04`, `menu-02`, `menu-03`

### Critères d’acceptation

- [ ] Drawer : Mes chroniques + `mdi-book-multiple`.
- [ ] CTA orange cloud sous Nouvelle/Importer ; libellé selon auth.
- [ ] Envoyer vers le cloud à côté d’Exporter ; plus de cloud dans le header de carte (Lot 2 finalise le layout).
- [ ] Préférences (`drawer.preferences`, même libellé que la modale) dans le menu compte ; Sauvegardes à côté d’Aide ; menu compte **dans** le drawer (pas d’overlay page).
- [ ] Caption Licence étudiante sur le **compte** (H.3). Pas de caption cloud / licence dans la modale login.
- [ ] Toutes les chaînes saveAs → Dupliquer ; icône `mdi-content-duplicate` ; dialog `sm`.
- [ ] Focus outlined = accent (vérifier Dupliquer **et** un autre champ, ex. login cloud).

---

## Lot 1Bis — Indicateur cloud sur Mon compte

**IDs** : H.8  
**Dépend de** : Lot 1 (barre `user-bar` déjà en place)  
**Prompt** : `LOT-01BIS`  
**CR** : [LOT-01BIS](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-01bis)

Complément du Lot 1 après écart CR : le CTA orange « Se connecter au cloud » a été remplacé par **Importer depuis le cloud**. L’état de session n’a plus de voyant dans le chrome compte.

### Décisions

- Icône **accent** (`var(--accent)` / `color="accent"` si le token Quasar est branché sur la même couleur) dans la barre **Mon compte** (`user-bar`), à droite du nom / caption, **avant** le chevron.
- Connecté (`useCloud().sharedState.isAuthenticated`) : `mdi-cloud-outline`.
- Déconnecté : `mdi-cloud-off-outline`.
- Tooltip + `aria-label` i18n : Connecté au cloud / Non connecté au cloud (FR + en-US).
- **Déconnecté** : clic **icône** → `openCloud()` (même entrée que **Importer depuis le cloud**). `@click.stop` pour ne pas ouvrir le `q-menu` compte.
- **Connecté** : pas d’action dédiée sur l’icône (le clic remonte à la barre = menu compte).
- Avatar / nom / chevron : menu compte inchangé.
- Ne pas modifier le contenu de `CloudLoginDialog` (H.4). Ne pas retoucher le Lot 2 (cloud sur la carte).

### Fichiers

- `front/src/pages/userspace/_components/drawer/Index.vue` (`user-bar`)
- `front/src/i18n/fr/index.ts` / `en-US` (clés drawer, ex. `cloudConnected` / `cloudDisconnected`)

Réutiliser `useCloud` déjà injecté dans le drawer. Pas de nouvelle dépendance.

### Captures

`accueil-02` (barre compte, **avant** — pas de voyant)

### Critères d’acceptation

- [ ] Déconnecté : nuage barré orange dans Mon compte.
- [ ] Connecté : nuage non barré orange au même endroit.
- [ ] Déconnecté + clic **icône** = modale connexion cloud (pas le menu compte).
- [ ] Clic avatar / nom / chevron = menu compte. Connecté + clic icône = menu compte.
- [ ] Tooltip / `aria-label` selon l’état.

---

## Lot 2 — Carte Mes chroniques

**IDs** : H.1, H.6, H.7  
**Dépend de** : Lot 1  
**Prompt** : `LOT-02`  
**CR** : [LOT-02](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-02)

### Décisions

- Chip mode (Calendrier / Chronomètre) sur la **3e ligne** (relevés / catégories / observables / modifié), plus contre le cloud.
- 4 CTA **dans** `.chronicle-header` (bandeau gris), sous les métadonnées. Plus de `div.q-px-md` sous le header.
- Tous au repos : pas de `isPrimary`, pas de `primary-action`.
- Filet **accent**, fond **blanc**, `border-radius: 0.5rem` (géométrie du `cloud-btn`, en négatif : outline orange / fill blanc).
- Icônes = celles de `useChronicleNavigation` + verbes du recueil :

| Icône | Libellé |
|-------|---------|
| `mdi-flask-outline` | Constituer mon protocole |
| `mdi-binoculars` | Faire mon observation |
| `mdi-chart-line` | Voir mon graphe d’activité |
| `mdi-chart-box` | Voir mes statistiques |

- Graphe / Stats `disabled` s’il n’y a pas de relevés (déjà dans `useChronicleNavigation`).
- Retirer le bouton cloud de la carte (H.2).

### Fichiers

- `front/src/pages/userspace/home/_components/active-chronicle/Index.vue`
- `front/src/composables/use-chronicle-navigation/index.ts` (ne plus filtrer `statistics` côté carte)
- `front/src/i18n/fr/index.ts` / `en-US` : `chronicle.ctaGraph` (FR actuel : « graph » → **graphe**), `chronicle.ctaStatistics` si absent
- `front/src/pages/userspace/home/Index.vue` : retirer le câblage `@cloud` sur `ActiveChronicle` s’il ne sert plus

Ne pas changer les routes (`user_analyse`, `user_statistics`).

### Captures

`accueil-01`, `accueil-06`, `accueil-07`

### Critères d’acceptation

- [ ] Chip mode sur la ligne des métadonnées.
- [ ] 4 CTA dans le gris, repos, filet orange / fond blanc, icônes + verbes.
- [ ] Stats présente ; Graphe n’est plus « plein » à tort.
- [ ] Plus de cloud sur la carte.

---

## Lot 3 — Protocole : libellés, grille, CTA

**IDs** : P.1, P.2, P.3, P.7  
**Prompt** : `LOT-03`  
**CR** : [LOT-03](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-03)  
Ne pas encore remplacer les modales d’ajout (Lot 4).

### Décisions

- Titre page : **Protocole - {nom de la chronique}** (plus `Protocol`).
  - Affichage : i18n + nom de la **chronique**, pas le `protocol.name` stocké s’il est encore `Protocol - …`.
  - **Ne pas** modifier le défaut API `'Protocol - '` (donnée partagée web / Electron / mobile / EN).
- Type : **continue** / **ponctuelle** partout (badge, select, édition, tooltips). Plus de `continuous` / `discrete` / « Ponctuel (événement) ».
- Grille : noms à gauche, actions **alignées à droite** (colonnes stables). Le `q-tree` header actuel pousse badge + boutons dans le même flux.
- CTA **Aller à l’observation** (navigation `user_observation`, pas Rec).

### Fichiers

- `front/src/pages/userspace/protocol/Index.vue`
- `front/src/pages/userspace/protocol/_components/AddCategoryModal.vue`
- `front/src/pages/userspace/protocol/_components/EditCategoryModal.vue`
- `front/src/i18n/fr/index.ts` / `en-US` : `protocolUi.actionTypeContinuous`, `actionTypeDiscrete`, titre page

Le badge affiche aujourd’hui `prop.node.action` brut (`continuous` / `discrete`). Mapper vers les libellés i18n. **Front only.**

### Captures

`protocole-01`, `protocole-02`, `protocole-03`, `protocole-05`, `protocole-10`

### Critères d’acceptation

- [ ] Heading **Protocole - {chronique}** (i18n front, pas d’écriture API).
- [ ] Aucun `continuous` / `discrete` / « Ponctuel (événement) » visible.
- [ ] Boutons d’action alignés à droite, noms à gauche.
- [ ] CTA Aller à l’observation.

---

## Lot 4 — Protocole : saisie inline, empty, D&D

**IDs** : P.4, P.5, P.6, P.8, P.9  
**Dépend de** : Lot 3  
**Prompt** : `LOT-04`  
**CR** : [LOT-04](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-04)

### Décisions

- Saisie **inline** (nom + description). Entrée = valider et nouvelle ligne. Échap = abandonner.
- Retirer le **+** de la ligne catégorie (il déclenche aujourd’hui l’ajout d’observable).
- Pas de champ ordre à l’ajout (supprime le `default-order="state.treeData.length"` 0-based).
- Empty state :

  > Ajoutez au moins une catégorie, puis un ou plusieurs observables.

  La page vide **porte déjà** le champ de la première catégorie. Plus de *No protocol items found*.
- Réordonnancement **drag and drop** ; flèches **en complément clavier** (garder un moyen sans souris). Pas de nouvelle lib (pas de `vuedraggable`). HTML5 DnD ou API `order` déjà utilisée par `MoveObservableModal` / `editProtocolItem`.

Les modales **Edit** / **Remove** / **Move** peuvent rester pour l’édition. Les modales **Add**Category / **Add**Observable ne sont plus le flux principal. Ne pas laisser le champ ordre dans le flux d’ajout.

### Fichiers

- `front/src/pages/userspace/protocol/Index.vue`
- `front/src/pages/userspace/protocol/_components/AddCategoryModal.vue` (débrancher ou ne plus ouvrir)
- `front/src/pages/userspace/protocol/_components/AddObservableModal.vue`
- Composables / services protocole déjà utilisés par `Index.vue` (`useObservation().protocol`)
- i18n empty state

### Captures

`protocole-04`, `protocole-06`, `protocole-07`, `protocole-08`, `protocole-09`

### Critères d’acceptation

- [ ] Ajout catégorie / observable sans modale one-shot.
- [ ] Pas de + sur la ligne catégorie.
- [ ] Pas de champ ordre à l’ajout.
- [ ] Empty FR + champ première catégorie déjà là.
- [ ] D&D reorder + flèches clavier.

---

## Lot 4Bis — D&D observable vers une autre catégorie

**IDs** : P.10  
**Dépend de** : Lot 4 (D&D intra-catégorie déjà en place)  
**Prompt** : `LOT-04BIS`  
**CR** : [LOT-04BIS](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-04bis)

Complément du Lot 4 : P.6 reste le réordre **dans** la catégorie. Ici le drop vers une autre catégorie **rejoue la modale Déplacer**, et **corrige** le payload (bug : `action` / `graphPreferences` perdus).

Séquence inchangée (`MoveObservableModal.vue`) :

```
deleteItem(observable.id, protocolId)
addObservable({ protocolId, parentId, name, description, order: target.children.length, action?, graphPreferences? })
loadProtocol(currentObservation)
```

Sans correctif API, le front peut envoyer ces champs : le contrôleur `POST …/protocols/item` (branche observable) ne transmet que `protocolId`, `name`, `description`, `order`, `categoryId`. `addObservable` du service les accepte déjà. Les autres appels (inline, duplicate) ne les envoient pas → `undefined` → comportement actuel.

### Pourquoi ce n’est pas un effet de bord Rec / stats

| Surface | Mécanisme | Après le move (avec copie) |
|---------|-----------|----------------------------|
| Observation Rec | `category.action` + `category.children` ; bouton actif = `children.find(obs => obs.name === reading.name)` | Inchangé. Continue vs ponctuelle = **catégorie cible**. `observable.action` n’est pas lu. |
| Relevés | `IReading.name` (pas d’id) | DATA **non** réécrits. |
| Stats | Fratrie = noms des enfants ; mode = `category.action` | L’historique du nom change de fratrie / de mode **comme aujourd’hui** (effet métier du déplacement, pas de la copie). |
| Graphe | `mergeGraphPreferences(catégorie, nœud)` — clés héritables seulement : `color`, `strokeWidth`, `backgroundPattern` | **Correctif** : si le nœud avait un override, il est conservé. Sinon (prefs absentes) : héritage de la **catégorie cible**, identique à aujourd’hui. `displayMode` / `supportCategoryId` / `visible` restent propres à la **catégorie** (non fusionnés). |

Ne pas PATCH `graph-preferences` après coup : un seul `addObservable`. Ne pas recopier un objet vide (`{}`) — omettre le champ si le nœud n’a pas de prefs.

### Décisions

- Extraire **une** fonction `moveObservableToCategory(observable, targetCategoryId)` (dans `Index.vue` ou `protocol.service.ts` front existant — pas de nouveau package). Même try que la modale + `action` / `graphPreferences` **si définis**.
- Brancher **D&D** et **MoveObservableModal** sur cette fonction (= le correctif de la modale).
- Drop :
  - sur une **ligne catégorie** dont l’id ≠ catégorie source → `targetCategoryId` = cet id ;
  - sur un **observable d’une autre catégorie** → `targetCategoryId` = **parent** de cet observable (toujours un append ; la modale ne choisit pas l’index).
- Intra-catégorie : inchangé (Lot 4, `editProtocolItem` + `order`). Ne pas passer par delete+add dans la même catégorie.
- Flèches haut/bas : intra-catégorie.
- API **minimale** (pas de migration, pas de `parentId` sur `EditItemDto`) :
  1. `AddProtocolItemDto` : `graphPreferences?` optionnel (`@IsOptional()` `@IsObject()`, type `IGraphPreferences` déjà importé). `action` est déjà sur le DTO.
  2. Branche observable de `addProtocolItem` : passer `action: body.action` et `graphPreferences: body.graphPreferences` à `items.addObservable`.
- Front : `AddObservableDto` accepte `action?` et `graphPreferences?`.
- Pas d’insert. Pas `vuedraggable`. Pas `mobile/` ni `packages/`. Pas d’autre route API.
- Nouvel UUID : attendu. Unique `name` global : delete **avant** add (`ConflictException` sinon).

### Fichiers

- `front/src/pages/userspace/protocol/Index.vue` (`onRowDragOver` / `onRowDrop`)
- `front/src/pages/userspace/protocol/_components/MoveObservableModal.vue`
- `front/src/services/observations/protocol.service.ts` (`AddObservableDto` ; helper optionnel)
- `api/src/core/observations/controllers/protocol.controller.ts` (`AddProtocolItemDto` + branche observable de `POST item`)
- i18n seulement si un toast dédié manque déjà (`moveObservableSuccess` / `moveObservableFailed` existent)

### Captures

Aucune capture « avant » dédiée (comportement D&D absent). Vérifier sur le jeu Lieu / Action / Événements : drop **et** modale Déplacer vers la même cible.

### Critères d’acceptation

- [ ] Drop d’un observable sur une autre catégorie : même résultat que Déplacer vers cette catégorie (append, disparu de l’ancienne).
- [ ] Payload add = `name` + `description` + `order: children.length` + `action` / `graphPreferences` **s’ils existent** sur le nœud.
- [ ] Grep : `POST item` observable transmet `action` et `graphPreferences`. Les ajouts inline / duplicate **sans** ces champs restent comme aujourd’hui.
- [ ] Rec / stats : même comportement qu’un move actuel (carte cible, fratrie par nom). Graphe : override `color` / `strokeWidth` / `backgroundPattern` du nœud **conservé** s’il existait.
- [ ] D&D intra-catégorie + flèches inchangés.

---

## Lot 5 — Observation : session Rec / Pause / Terminer

**IDs** : O.1, O.2, O.3, O.5, O.6, O.9, O.11  
**Prompt** : `LOT-05`  
**CR** : [LOT-05](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-05)

### Décisions

Sémantique :

| Contrôle | Effet |
|----------|--------|
| **Rec** (rouge) | Démarrer / reprendre. Après **Terminer** : nouveau segment, dit à l’écran. |
| **Pause** | Geler, **même session**. Pas d’écriture Fin. |
| **Terminer** | Fin + **confirmation**. |

Toasts : « Observation en pause » / « Observation terminée ».

Chrome gauche / droite (O.6) :

| | Gauche | Droite |
|---|--------|--------|
| Ligne 1 | Titre Tableau de bord d'observation | Titre Relevés |
| Ligne 2 | Rec / Pause / Terminer + timer + **Réinitialiser la disposition** (libellé) | Ajouter relevé / commentaire / auto-correct |
| Ensuite | − / + (échelle, `q-tooltip`) ; plateau ; **Détacher sur le cadre des cartes** | (Lot 6) |

- Titres L/R **sur la même ligne**.
- Tooltip Détacher : « Détacher les boutons » (`q-tooltip`, plus seulement `title`).
- O.9 : cacher le **chip** mode une fois l’observation démarrée. Le sélecteur Calendrier / Chronomètre reste **avant** le premier START.
- Timer : quitte la colonne Relevés, rejoint la barre session gauche.

### État actuel (à lire avant de coder)

- `CalendarToolbar.vue` : play/stop ronds, **uniquement** dans la branche **sans vidéo** de `observation/Index.vue`.
- `ObservationToolbar.vue` : **non monté** dans `Index.vue`. Ne pas le « ressusciter » sans besoin : la barre cible est **sous le titre gauche** (`buttons-side/Index.vue`).
- Branche **avec vidéo** : pas de barre session aujourd’hui. Le Rec doit exister **dans les deux layouts**.
- Play actuel = toggle (`togglePlayPause` → `pauseTimer` / `startTimer`) ; Stop = `stopTimer` → `addStopReading()` (Fin). Rec = start/reprise ; Pause = `pauseTimer` ; Terminer = `stopTimer` + confirmation. **Ne pas** inventer un type de relevé. **Ne pas** faire écrire une Fin à la pause.

### Fichiers

- `front/src/pages/userspace/observation/_components/buttons-side/Index.vue`
- `front/src/pages/userspace/observation/_components/CalendarToolbar.vue` (retirer play/stop/timer/chip redondants une fois la barre gauche en place ; garder attache vidéo si c’est son rôle)
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/composables/use-observation/` (toggle play / stop — **lire** avant de changer la sémantique Pause ≠ Terminer)
- `front/src/i18n/fr/index.ts` / `en-US`
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsToolbar.vue` (retirer chip timer — Lot 6 peut finir le ménage recherche)

### Captures

`observation-01`, `observation-02`, `observation-03`, `observation-06`, `observation-10`, `observation-11`

### Critères d’acceptation

- [ ] Rec / Pause / Terminer + timer sous le titre gauche, **vidéo et non-vidéo**.
- [ ] Pause ne termine pas ; Terminer confirme et écrit Fin.
- [ ] Toasts pause / terminée.
- [ ] −/+ tooltips ; Détacher sur le cadre ; titres alignés.
- [ ] Chip mode masqué après START.

---

## Lot 6 — Observation : relevés + bannière orphelins

**IDs** : O.4, O.7, O.8, O.10, S.1  
**Prompt** : `LOT-06`  
**CR** : [LOT-06](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-06)  
S.1 est dans ce lot : **un** composant, branché Observation + Graphe + Stats.

### Décisions

- Poubelle **par ligne**. **Tout effacer** en bas, confirmation. Plus de Supprimer (sélection).
- Barre d’actions : ajouter relevé · commentaire · auto-correct. **Pas** find/replace dans cette barre.
- Recherche = filtre. Remplacer = expansion **du même champ** (compteur, Remplacer, Tout remplacer + confirmation). Cmd/Ctrl+F **seulement si** le champ recherche a le focus (ne pas capturer le find du navigateur web).
- O.8 : deux champs (date, heure+ms), icônes **prepend**. Annuler / Valider (i18n). Pas de titre visuel en calendrier. Pas de hint masque. Cible : `q-popup-edit` dans `ReadingsTable.vue`.
- O.10 : bannière **juste au-dessus du tableau**, après titre / actions / recherche (aujourd’hui elle est **au-dessus** de la toolbar).
- S.1 : extraire un composant unique (même wording `graphUi.readingsAfterLastStopWarning` ou clé dédiée) utilisé par :
  - `observation/_components/readings-side/Index.vue`
  - `analyse/_components/graph/Index.vue`
  - `statistics/Index.vue`

### Fichiers

- `front/src/pages/userspace/observation/_components/readings-side/Index.vue`
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsToolbar.vue`
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`
- Nouveau composant bannière sous `front/src/components/` **ou** `front/src/pages/userspace/_components/` (un seul, `defineComponent`)
- Branchement graphe + stats (remplacer les `q-banner` dupliqués)
- i18n

### Captures

`observation-04`, `observation-05`, `observation-07`, `observation-08`, `observation-09`, `stats-01`

### Critères d’acceptation

- [ ] Poubelle ligne + Tout effacer en bas.
- [ ] Replace dans le champ recherche, plus le bouton `find_replace` isolé.
- [ ] Popup date/heure conforme O.8.
- [ ] Bannière orphelins au-dessus du tableau Observation ; même composant sur Graphe et Stats.

---

## Lot 7 — ExportMenu partagé

**IDs** : G.1 (partie export), E.1, S.4  
**Prompt** : `LOT-07`  
**CR** : [LOT-07](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-07)

### Décisions

- Groupe **affichage à gauche** (Graphe) : − · + · Ajuster l’affichage. Le reset vue reste avec l’affichage.
- **Export : icône `mdi-download` à droite** du header (Graphe et Stats). Tooltip « Exporter ». Plus de label texte.
- Composant **`ExportMenu`** :
  1. Radios contenu si besoin (graphe : graphe / légende / …)
  2. Toggle format si **≥ 2** formats
  3. CTA Exporter
  4. **0 choix** (un seul format, pas de contenu) → clic icône = export direct, **pas de menu**
- S.4 : même icône dans l’en-tête de **carte** (`AmChartsBarChart` / `AmChartsPieChart`), **hors du plot** (aujourd’hui `position: absolute; top: 0; right: 0` dans le chart).

`use-statistics-export.ts` : déjà excel-only si une seule worksheet — le cas « 0 choix » doit cliquer-direct.

### Fichiers

- Nouveau : `front/src/pages/userspace/_components/ExportMenu.vue` (ou `front/src/components/` — un seul endroit)
- `front/src/pages/userspace/analyse/_components/graph/Index.vue` (header ~L7–L160)
- `front/src/pages/userspace/statistics/Index.vue` (bouton export toolbar)
- `front/src/pages/userspace/statistics/_components/AmChartsBarChart.vue`
- `front/src/pages/userspace/statistics/_components/AmChartsPieChart.vue`
- `front/src/composables/use-statistics/use-statistics-export.ts`
- `front/src/composables/use-chart-image-export.ts`
- i18n `graphUi.export*`

Ne pas changer les formats d’export eux-mêmes (Excel / PNG / etc.). Conserver le branchement Electron vs téléchargement navigateur déjà présent (`saveImageViaElectron`).

### Captures

`export-01`, `export-02`, `stats-04`

### Critères d’acceptation

- [ ] Graphe : zoom/ajuster à gauche, icône export à droite.
- [ ] Stats page : icône à droite, menu seulement si ≥ 2 formats.
- [ ] Un seul format → clic = export.
- [ ] Export de carte hors du plot, en-tête du bloc.

---

## Lot 8 — Graphe : affichage

**IDs** : G.2, G.3, G.4, G.5, G.6, G.7  
**Dépend de** : Lot 7 (header G.3)  
**Prompt** : `LOT-08`  
**CR** : [LOT-08](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-08)

### Décisions

- **G.2** : format du temps dans **Ajuster l’affichage**, section Axe du temps (avec l’étirement). Retirer le `q-select` de la toolbar (`graph/Index.vue`).
- **G.3** : headers L/R même hauteur, un seul filet sous le titre à droite (`graph/Index.vue` + `graph-customization-drawer/Index.vue` `.drawer-header`).
- **G.4** : catégories **continues** — icônes **sous** le titre (Normal / Frise / Arrière-plan), état actif visible, tooltip, sous-menu support pour l’arrière-plan. **Ponctuelles** : pas de contrôle. Adapter `DisplayModeSelect.vue` (aujourd’hui trigger pleine largeur + dropdown).
- **G.5** : slider `1 px` — curseur — `10 px` (labels aux extrémités, plus seulement `label-value` flottant).
- **G.6** : à la création, **une couleur par catégorie** (palette existante ou liste courte **déjà dans le code** — ne pas ajouter de lib). Observables héritent. Un enfant **déjà recalé garde** sa couleur si on change la catégorie. Cible : `getObservablePropagationPatch` dans `graph-preferences.utils.ts` + tests `graph-preferences.utils.test.ts`. Aujourd’hui le patch **copie** `color` / `strokeWidth` vers les enfants. **Ne pas** modifier `packages/graph/` ni les enums persistés (le mobile les relit).
- **G.7** : motif **Uni** (plus « Aucun motif ») — i18n `graphUi.patternNone` **et** fallback durci `'Aucun motif'` dans `ItemBackgroundPattern.vue`.

### Fichiers

- `front/src/pages/userspace/analyse/_components/graph/Index.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/Index.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/DisplayModeSelect.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/ItemStrokeWidth.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/ItemBackgroundPattern.vue`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/graph-preferences.utils.ts`
- `front/src/pages/userspace/analyse/_components/graph-customization-drawer/graph-preferences.utils.test.ts`
- Point d’assignation couleur à la **création de catégorie** (protocole `addCategory` / graphPreferences) — **lire** le flux avant d’en inventer un
- `front/src/i18n/fr/index.ts` / `en-US`

### Captures

`graphe-01` … `graphe-05`

### Critères d’acceptation

- [ ] Plus de select format dans la toolbar ; il est dans Ajuster l’affichage.
- [ ] Headers alignés, un filet à droite.
- [ ] Modes en icônes sous le titre, continues only.
- [ ] Slider borné `1 px` / `10 px`.
- [ ] Héritage couleur sans écraser un override enfant (tests à jour).
- [ ] Libellé **Uni**.

---

## Lot 9 — Statistiques : onglets et gouttière

**IDs** : S.2, S.3  
**Dépend de** : Lots 6 (bannière) et 7 (export)  
**Prompt** : `LOT-09`  
**CR** : [LOT-09](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-09)

### Décisions

- Même gouttière G/D : onglets, export, alerte, cartes (aujourd’hui `q-tabs` vs `q-tab-panel q-pa-md` décalés).
- Onglets = **segmented control** (pills), actif en fond — plus l’underline Quasar `q-tabs` / `indicator-color="primary"`.

Ne pas retoucher le calcul statistique. Ne pas recréer `ExportMenu` ni la bannière.

### Fichiers

- `front/src/pages/userspace/statistics/Index.vue`
- `front/src/pages/userspace/statistics/_components/CategoryStatisticsView.vue` (si la gouttière y est)
- SCSS scoped de `Index.vue`

### Captures

`stats-02`, `stats-03`

### Critères d’acceptation

- [ ] Alignement gauche unique onglets / export / alerte / cartes.
- [ ] Segmented (pills), état actif en fond.

---

## Vérification locale (après chaque lot)

### Démarrer (une fois)

Depuis `actograph-v3` :

```bash
bash scripts/dev-electron.sh
```

Le script passe en Node 20, ouvre l’API (`yarn start:dev-electron`) dans un onglet Terminal, puis Electron (`quasar dev -m electron`). **Ne pas modifier le script.** Laisser la fenêtre ouverte pendant les lots. Quasar recharge en général le Vue tout seul. Si un i18n / SCSS ne bouge pas : recharger la fenêtre Electron. Si le Lot 3 a touché `'Protocol - '` côté API : l’onglet API en `start:dev` recompile ; relancer cet onglet seulement si besoin.

**Pas** `scripts/dev-web.sh` : pas de drawer Electron, pas de licence étudiante desktop, pas de dialogue OS.  
**Pas** le `.app` installé v0.0.178 : il ne contient pas les lots.

### Après Composer

1. Composer a rempli le CR (Livré, Files affected). Il **ne coche pas** « UI Electron » — c’est Morgane.
2. Même app Electron déjà lancée.
3. Chronique **« Ma super chronique »**, FR, **licence étudiante**.
4. Jouer **uniquement** les IDs du lot (tableau). Les captures du recueil sont l’**avant**, pas la cible.
5. Cocher **Vérification** dans le CR + noter ce qui a été cliqué.

### Parcours par lot

| Lot | Où aller | Ce que tu dois voir |
|-----|----------|---------------------|
| 1 | Tiroir, menu compte, Dupliquer, login cloud | Mes chroniques ; CTA / **Importer depuis le cloud** ; **Préférences** ; Dupliquer `sm` ; focus orange ; **pas** de caption « licence étudiante / cloud » |
| 1Bis | Barre Mon compte, session cloud on/off | Nuage accent **barré** si déconnecté, **non barré** si connecté ; clic icône déconnecté = modale cloud |
| 2 | Mes chroniques, chronique ouverte | Chip sur la 3e ligne ; 4 CTA dans le gris ; plus de cloud sur la carte |
| 3 | Page Protocole | Titre Protocole - … ; continue / ponctuelle ; boutons alignés ; Aller à l’observation |
| 4 | Liste vide + ajout + ordre | Inline, empty FR, pas de +, D&D |
| 4Bis | Protocole, 2+ catégories | Drop = modale Déplacer (append) ; override couleur nœud **conservé** si présent ; Rec/stats = catégorie cible |
| 5 | Observation **avec et sans** vidéo | Rec / Pause / Terminer ; Pause ≠ Fin ; timer à gauche |
| 6 | Tableau relevés (+ Graphe / Stats pour la bannière) | Poubelle ligne ; replace dans la recherche ; datetime ; bannière au-dessus du tableau |
| 7 | Graphe + Stats + une carte | Icône à droite ; 1 format = clic direct ; export hors du plot |
| 8 | Drawer personnalisation graphe | Format temps dans Ajuster ; modes icônes ; Uni ; slider 1–10 px |
| 9 | Onglets Stats | Pills + même gouttière |

Complément Lot 8 seulement : `yarn test` dans `front/` sur `graph-preferences.utils.test.ts` — pas un substitut du clic Electron.
