# Prompts Composer 2.5 — UX desktop

**Auteur** : Morgane Le Moal  
**Date** : 22 septembre 2026  
**Plan** : [20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md](./20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md)  
**Recueil** : [20260922141500-test-manuel-desktop-Morgane-Le-Moal.md](./20260922141500-test-manuel-desktop-Morgane-Le-Moal.md)  
**Captures** : [captures-test-manuel-desktop/](./captures-test-manuel-desktop/)  
**CR** : [20260922172700-cr-ux-desktop-Morgane-Le-Moal.md](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md)

Un prompt = un lot = une session Composer 2.5. Copier le **préambule** + le bloc `LOT-0N`. Ne pas enchaîner deux lots dans la même session. En fin de session, **remplir uniquement la section `LOT-0N` du CR unique** (ne pas recréer le fichier, ne pas vider les autres sections).

---

## Index

| Prompt | Lot | IDs | CR |
|--------|-----|-----|----|
| `LOT-01` | Drawer | H.5 H.2 H.3 M.2 M.4 | [§ LOT-01](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-01) |
| `LOT-02` | Carte Mes chroniques | H.1 H.6 H.7 | [§ LOT-02](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-02) |
| `LOT-03` | Protocole libellés / grille / CTA | P.1 P.2 P.3 P.7 | [§ LOT-03](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-03) |
| `LOT-04` | Protocole inline + D&D | P.4 P.5 P.6 P.8 P.9 | [§ LOT-04](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-04) |
| `LOT-05` | Observation session | O.1 O.2 O.3 O.5 O.6 O.9 O.11 | [§ LOT-05](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-05) |
| `LOT-06` | Relevés + bannière orphelins | O.4 O.7 O.8 O.10 S.1 | [§ LOT-06](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-06) |
| `LOT-07` | ExportMenu | G.1 E.1 S.4 | [§ LOT-07](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-07) |
| `LOT-08` | Graphe affichage | G.2–G.7 | [§ LOT-08](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-08) |
| `LOT-09` | Stats onglets / gouttière | S.2 S.3 | [§ LOT-09](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-09) |

Hors périmètre (ne jamais coder) : **M.1**, **M.3**, **I.1**, **H.4** (pas de caption cloud selon licence).

---

## Préambule (coller au-dessus de chaque LOT)

```
Métier : développeur frontend ActoGraph v3 (Vue 3, Quasar, defineComponent). L’application est déjà en production.
Rôle : agent d’exécution UX. Tu appliques les décisions déjà tranchées dans le recueil. Tu n’arbitres pas le produit, tu ne modernises pas, tu ne sors pas du lot.

Tu es Composer 2.5. Tu implémentes UN SEUL lot du plan UX desktop ActoGraph v3.

Lis d’abord, dans cet ordre :
1. actograph-v3/docs/reviews/20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md — la section du lot demandé
2. actograph-v3/docs/reviews/20260922141500-test-manuel-desktop-Morgane-Le-Moal.md — uniquement les IDs du lot
3. actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-0N uniquement. Tu la REMPLIS en fin de session. Tu ne recrées pas le fichier. Tu ne touches pas aux autres sections.
4. Les fichiers listés dans le lot (lire avant d’écrire)

Règles :
- defineComponent + setup(). Pas de <script setup>.
- Commentaires de code en anglais. i18n FR + en-US en parallèle.
- Pas de nouvelle dépendance. Pas de package.json, Docker, .env, CI, migration.
- Pas d’architecture nouvelle. Réutiliser DDialogCard, d-action-btn, composables existants.
- Couleurs : var(--accent), var(--primary). Le $primary Quasar est commenté : le focus bleu actuel est le défaut Quasar.
- Si un détail manque dans le recueil : écrire « I don’t know » dans le CR et ne pas inventer.
- Ne pas toucher aux lots suivants ni au hors périmètre (M.1 Exporter inchangé, M.3 Fusionner inchangé, I.1 version inchangée, H.4 pas de caption cloud / licence).
- En fin de lot : remplir UNIQUEMENT la section LOT-0N du CR unique (statut, cases Livré, Files affected, écarts). Laisser les cases UI Electron à Morgane. Ne pas vider les autres sections. Ne pas committer.
- Ne pas toucher à `mobile/`, `packages/core/`, `packages/graph/` (moteur). `front/` est partagé web + Electron : conserver les `v-if="isElectron"`. Pas d’écriture API (P.1 = overlay). Pause = `pauseTimer`, Terminer = `stopTimer`. Lire la section « Multi-device » du plan.
```

---

## LOT-01 — Drawer

```
LOT-01 uniquement.

Métier / rôle de cette session : intégrateur chrome desktop (drawer Quasar, navigation, i18n, design system ActoGraph). Tu ranges le tiroir et les libellés compte / cloud / duplication. Tu ne touches pas à la carte chronique (Lot 2).

Plan : section « Lot 1 — Drawer ».
Recueil : H.5, H.2, H.3, M.2, M.4.
Captures : accueil-02, accueil-03, accueil-04, menu-02, menu-03.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-01 uniquement.
Test local : plan § Vérification locale + CR section LOT-01 (Electron). Composer ne coche pas UI Electron.

À faire :
- Nav + titre de bloc : Mes chroniques, icône mdi-book-multiple (menu.ts + chronicle.home + homePage.yourChronicles).
- CTA cloud orange sous Nouvelle / Importer (réutiliser d-action-btn). Libellés : Se connecter au cloud / Accéder aux chroniques cloud.
- Envoyer vers le cloud dans le sous-menu chronique, à côté d’Exporter.
- Bas de drawer : Sauvegardes automatiques, Aide, Mon compte (Licence étudiante). Menu compte DANS le drawer, vers le haut. Entrée **Préférences** (même clé `drawer.preferences` que le titre de la modale — plus « Préférences et affichage » / `preferencesDisplay`).
- Renommer Enregistrer sous → Dupliquer (menu, icône mdi-content-duplicate, tooltip, titre, CTA, toasts, hint). Suffixe (copie) inchangé. SaveAsDialog size="sm", champ qui tient dans la carte (q-gutter-y-md).
- Conserver v-if isElectron (Changer de licence, Sauvegardes, Quitter). Focus outlined → var(--accent) userspace + dialogs (pas l’admin).

Ne pas : changer export.service.ts saveAsObservation ; M.1 ; M.3 ; H.4 (aucune caption cloud / licence dans CloudLoginDialog) ; layout des 4 CTA de la carte (Lot 2).
```

---

## LOT-02 — Carte Mes chroniques

```
LOT-02 uniquement. Le Lot 1 doit déjà être en place.

Métier / rôle de cette session : intégrateur UI carte chronique (layout, CTA, design system ActoGraph). Tu travailles dans le bandeau gris de la chronique active. Tu ne retouches pas le drawer.

Plan : section « Lot 2 — Carte Mes chroniques ».
Recueil : H.1, H.6, H.7.
Captures : accueil-01, accueil-06, accueil-07.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-02 uniquement.
Test local : plan § Vérification locale + CR section LOT-02 (Electron). Composer ne coche pas UI Electron.

Fichier principal : front/src/pages/userspace/home/_components/active-chronicle/Index.vue
Aussi : use-chronicle-navigation/index.ts (ne plus filtrer statistics), i18n ctaGraph / ctaStatistics, home/Index.vue si @cloud devient mort.

À faire :
- Chip mode sur la 3e ligne (métadonnées), plus à côté du cloud.
- Retirer le q-btn cloud de la carte.
- 4 CTA DANS .chronicle-header, sous les métadonnées. Tous au repos (supprimer isPrimary / primary-action).
- Style : fond blanc, filet accent, border-radius 0.5rem, icônes drawer + verbes du recueil (graphe avec un « e »).
- Graphe / Stats disabled s’il n’y a pas de relevés (déjà dans useChronicleNavigation).

Ne pas : retoucher le drawer (Lot 1) ; ne pas changer les names de routes.
```

---

## LOT-03 — Protocole libellés / grille / CTA

```
LOT-03 uniquement. Ne pas remplacer les modales d’ajout (Lot 4).

Métier / rôle de cette session : intégrateur i18n protocole. Tu corriges les libellés métier (continue / ponctuelle), la grille d’actions et le titre de page. Tu ne refonds pas le flux d’ajout.

Plan : section « Lot 3 — Protocole : libellés, grille, CTA ».
Recueil : P.1, P.2, P.3, P.7.
Captures : protocole-01, protocole-02, protocole-03, protocole-05, protocole-10.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-03 uniquement.
Test local : plan § Vérification locale + CR section LOT-03 (Electron). Composer ne coche pas UI Electron.

À faire :
- Titre affiché : Protocole - {nom de la chronique} via i18n + chronicle name. Ne pas afficher protocol.name s’il vaut encore « Protocol - … ».
- **Ne pas** modifier api/.../observation/index.service.ts (défaut 'Protocol - '). Overlay front seulement.
- continue / ponctuelle partout (badge q-tree inclus : ne plus afficher prop.node.action brut). Plus de « Ponctuel (événement) ».
- Grille : noms à gauche, actions alignées à droite (colonnes stables).
- CTA Aller à l’observation → route user_observation (navigation, pas Rec).

Ne pas : saisie inline, empty state, D&D, suppression du champ ordre (Lot 4).
```

---

## LOT-04 — Protocole inline + D&D

```
LOT-04 uniquement. Le Lot 3 doit déjà être en place.

Métier / rôle de cette session : développeur interaction protocole. Tu remplaces l’ajout par modale par une saisie inline, un empty state FR, et un réordonnancement drag and drop sans nouvelle librairie.

Plan : section « Lot 4 — Protocole : saisie inline, empty, D&D ».
Recueil : P.4, P.5, P.6, P.8, P.9.
Captures : protocole-04, protocole-06, protocole-07, protocole-08, protocole-09.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-04 uniquement.
Test local : plan § Vérification locale + CR section LOT-04 (Electron). Composer ne coche pas UI Electron.

À faire :
- Ajout catégorie / observable en inline (nom + description). Entrée = valider + nouvelle ligne. Échap = abandonner.
- Retirer le + de la ligne catégorie.
- Pas de champ ordre à l’ajout (le default-order = length est 0-based et faux).
- Empty state FR : « Ajoutez au moins une catégorie, puis un ou plusieurs observables. » La page vide porte déjà le champ première catégorie. Plus de « No protocol items found ».
- Réordonnancement drag and drop. Flèches en complément clavier. Pas de nouvelle lib.

Les modales Edit / Remove / Move peuvent rester. AddCategoryModal / AddObservableModal ne sont plus le flux d’ajout.

Ne pas : retoucher P.1–P.3–P.7 déjà faits ; pas de vuedraggable.
```

---

## LOT-05 — Observation session

```
LOT-05 uniquement.

Métier / rôle de cette session : développeur observation. Tu es responsable de la sémantique Rec / Pause / Terminer (Pause ≠ Fin) et du chrome split gauche-droite. Tu ne touches pas au tableau des relevés.

Plan : section « Lot 5 — Observation : session Rec / Pause / Terminer ».
Recueil : O.1, O.2, O.3, O.5, O.6, O.9, O.11.
Captures : observation-01, observation-02, observation-03, observation-06, observation-10, observation-11.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-05 uniquement.
Test local : plan § Vérification locale + CR section LOT-05 (Electron, avec ET sans vidéo). Composer ne coche pas UI Electron.

Lire avant d’écrire : CalendarToolbar.vue, buttons-side/Index.vue, observation/Index.vue, le composable use-observation (play/stop). ObservationToolbar.vue n’est PAS monté : ne pas le ressusciter sans besoin.

À faire :
- Barre sous le titre gauche (Tableau de bord d'observation) : Rec (rouge) · Pause · Terminer + timer. Présente avec ET sans vidéo (aujourd’hui CalendarToolbar n’existe que sans vidéo).
- Pause = geler, même session, pas de Fin (`pauseTimer`). Terminer = Fin + confirmation (`stopTimer` / `addStopReading`). Rec après Terminer = nouveau segment, dit à l’écran. Pas de nouveau type de relevé.
- Toasts : Observation en pause / Observation terminée.
- Ligne 2 gauche : session + libellé Réinitialiser la disposition. −/+ près des cartes avec q-tooltip. Détacher sur le cadre des cartes, tooltip « Détacher les boutons ».
- Titres gauche / droite alignés (même ligne).
- Cacher le chip mode une fois l’observation démarrée. Sélecteur Calendrier / Chronomètre conservé avant le premier START.
- Timer : plus dans la colonne Relevés.

Ne pas : poubelle / recherche / replace / popup datetime / bannière orphelins (Lot 6).
```

---

## LOT-06 — Relevés + bannière orphelins

```
LOT-06 uniquement.

Métier / rôle de cette session : développeur table de relevés. Tu ranges le CRUD des lignes (poubelle, tout effacer, recherche / replace, datetime) et tu extrais un composant d’alerte orphelins unique. Tu ne touches pas à Rec / Pause / Terminer.

Plan : section « Lot 6 — Observation : relevés + bannière orphelins ».
Recueil : O.4, O.7, O.8, O.10, S.1.
Captures : observation-04, observation-05, observation-07, observation-08, observation-09, stats-01.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-06 uniquement.
Test local : plan § Vérification locale + CR section LOT-06 (Electron). Composer ne coche pas UI Electron.

À faire :
- Poubelle par ligne. Tout effacer en bas avec confirmation. Plus de Supprimer (sélection).
- Barre d’actions : ajouter relevé, commentaire, auto-correct. Pas de find/replace dans cette barre.
- Recherche = filtre. Remplacer = expansion du même champ (compteur, Remplacer, Tout remplacer + confirmation). Cmd/Ctrl+F seulement si le champ a le focus (pas un listener window qui vole le find du navigateur).
- q-popup-edit datetime : 2 champs (date, heure+ms), icônes prepend, Annuler / Valider i18n, pas de titre visuel calendrier, pas de hint masque.
- Extraire UN composant bannière orphelins (même wording). Le brancher sur Observation, Graphe (analyse/_components/graph/Index.vue) et Stats.
- Placement Observation : juste au-dessus du tableau, après titre / actions / recherche (aujourd’hui au-dessus de la toolbar).

Ne pas : Rec/Pause/Terminer (Lot 5) ; ExportMenu (Lot 7) ; onglets stats (Lot 9).
```

---

## LOT-07 — ExportMenu

```
LOT-07 uniquement.

Métier / rôle de cette session : développeur composant d’export. Tu factorises l’UI d’export (Graphe, Stats, cartes AmCharts). Tu ne changes pas les formats produits (Excel, PNG, etc.).

Plan : section « Lot 7 — ExportMenu partagé ».
Recueil : G.1 (export), E.1, S.4.
Captures : export-01, export-02, stats-04.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-07 uniquement.
Test local : plan § Vérification locale + CR section LOT-07 (Electron). Composer ne coche pas UI Electron.

Créer un composant ExportMenu (defineComponent) et l’utiliser au Graphe, à la page Stats, et sur les cartes AmCharts.

À faire :
- Graphe : groupe affichage à gauche (− + Ajuster l’affichage ; reset vue avec l’affichage). Icône mdi-download à droite, tooltip Exporter, plus de label texte.
- Stats page : même icône à droite du header.
- ExportMenu : radios contenu si besoin → toggle format si ≥ 2 formats → CTA Exporter. Si 0 choix (un seul format, pas de contenu) : clic icône = export direct, pas de menu.
- S.4 : sortir le bouton des AmChartsBarChart / AmChartsPieChart (plus d’absolute dans le plot) ; le mettre dans l’en-tête du bloc.

Réutiliser use-statistics-export.ts et use-chart-image-export.ts. Ne pas changer les formats produits.

Ne pas : G.2–G.7 (Lot 8) ; segmented stats (Lot 9).
```

---

## LOT-08 — Graphe affichage

```
LOT-08 uniquement. Le Lot 7 (header export) doit déjà être en place.

Métier / rôle de cette session : développeur graphe d’activité. Tu travailles les préférences visuelles (format temps, modes, slider, couleurs, motif). Tu ne recrées pas ExportMenu.

Plan : section « Lot 8 — Graphe : affichage ».
Recueil : G.2, G.3, G.4, G.5, G.6, G.7.
Captures : graphe-01 à graphe-05.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-08 uniquement.
Test local : plan § Vérification locale + CR section LOT-08 (Electron). Composer ne coche pas UI Electron.

À faire :
- G.2 : déplacer le select format du temps dans Ajuster l’affichage, section axe du temps (avec l’étirement). Plus de q-select dans la toolbar.
- G.3 : headers L/R même hauteur, un seul filet sous le titre drawer.
- G.4 : adapter DisplayModeSelect.vue — icônes sous le titre des catégories continues (Normal / Frise / Arrière-plan), état actif, tooltip, sous-menu support pour l’arrière-plan. Ponctuelles : pas de contrôle.
- G.5 : labels 1 px — curseur — 10 px.
- G.6 : une couleur par catégorie à la création ; héritage ; override enfant conservé. Lire getObservablePropagationPatch (il copie aujourd’hui color/strokeWidth). Mettre à jour graph-preferences.utils.test.ts. Ne pas ajouter de lib couleur.
- G.7 : Uni à la place de « Aucun motif » (i18n patternNone ET fallback durci dans ItemBackgroundPattern.vue).

Ne pas : recréer ExportMenu ; ne pas toucher aux stats.
```

---

## LOT-09 — Statistiques onglets / gouttière

```
LOT-09 uniquement. Lots 6 et 7 déjà en place (bannière + ExportMenu).

Métier / rôle de cette session : intégrateur statistiques. Tu alignes la gouttière et tu remplaces les q-tabs par un segmented control. Tu ne recalcules pas les stats et tu ne recrées ni ExportMenu ni la bannière.

Plan : section « Lot 9 — Statistiques : onglets et gouttière ».
Recueil : S.2, S.3.
Captures : stats-02, stats-03.
CR à remplir : actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — section LOT-09 uniquement.
Test local : plan § Vérification locale + CR section LOT-09 (Electron). Composer ne coche pas UI Electron.

Fichier principal : front/src/pages/userspace/statistics/Index.vue

À faire :
- Même gouttière gauche/droite pour onglets, export, alerte, cartes (q-tab-panel q-pa-md ne doit plus décaler).
- Onglets = segmented control (pills), actif en fond. Plus l’indicateur underline Quasar.

Ne pas : recalculer les stats ; recréer ExportMenu ; recréer la bannière orphelins.
```
