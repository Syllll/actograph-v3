# Prompts Composer 2.5 — UX desktop

**Auteur** : Morgane Le Moal  
**Date** : 22 septembre 2026  
**Plan** : [20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md](./20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md)  
**Recueil** : [20260922141500-test-manuel-desktop-Morgane-Le-Moal.md](./20260922141500-test-manuel-desktop-Morgane-Le-Moal.md)  
**Captures** : [captures-test-manuel-desktop/](./captures-test-manuel-desktop/)  
**CR** : [20260922172700-cr-ux-desktop-Morgane-Le-Moal.md](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md)

Un prompt = **préambule** + un bloc `LOT-0N`. Une session, un lot.  
Le **plan** porte Décisions, Fichiers, critères, SOP Electron. Le **recueil** tranche le métier. Ce fichier ne fait que dispatcher : ne pas y recopier le plan.

---

## Index

| Prompt | Lot | IDs | CR |
|--------|-----|-----|----|
| `LOT-01` | Drawer | H.5 H.2 H.3 M.2 M.4 | [§ LOT-01](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-01) |
| `LOT-01BIS` | Indicateur cloud Mon compte | H.8 | [§ LOT-01BIS](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-01bis) |
| `LOT-02` | Carte Mes chroniques | H.1 H.6 H.7 | [§ LOT-02](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-02) |
| `LOT-03` | Protocole libellés / grille / CTA | P.1 P.2 P.3 P.7 | [§ LOT-03](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-03) |
| `LOT-04` | Protocole inline + D&D | P.4 P.5 P.6 P.8 P.9 | [§ LOT-04](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-04) |
| `LOT-04BIS` | D&D observable → autre catégorie | P.10 | [§ LOT-04BIS](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-04bis) |
| `LOT-05` | Observation session | O.1 O.2 O.3 O.5 O.6 O.9 O.11 | [§ LOT-05](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-05) |
| `LOT-06` | Relevés + bannière orphelins | O.4 O.7 O.8 O.10 S.1 | [§ LOT-06](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-06) |
| `LOT-07` | ExportMenu | G.1 E.1 S.4 | [§ LOT-07](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-07) |
| `LOT-08` | Graphe affichage | G.2–G.7 | [§ LOT-08](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-08) |
| `LOT-09` | Stats onglets / gouttière | S.2 S.3 | [§ LOT-09](./20260922172700-cr-ux-desktop-Morgane-Le-Moal.md#lot-09) |

Hors périmètre : **M.1**, **M.3**, **I.1**, **H.4**.

---

## Préambule (coller au-dessus de chaque LOT)

```
Tu es Composer 2.5. Un seul lot. ActoGraph v3 déjà en production (Vue 3, Quasar, defineComponent + setup — pas de <script setup>).

Lis, dans cet ordre. N’y réécris pas par-dessus :
1. actograph-v3/docs/reviews/20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md — Contraintes, Multi-device, section du lot, Vérification locale
2. actograph-v3/docs/reviews/20260922141500-test-manuel-desktop-Morgane-Le-Moal.md — uniquement les IDs du lot
3. Les fichiers listés dans le lot du plan (lire avant d’écrire)
4. actograph-v3/docs/reviews/20260922172700-cr-ux-desktop-Morgane-Le-Moal.md — en fin de session, remplir UNIQUEMENT la section LOT-0N (Livré, Files affected, écarts). Ne pas recréer le fichier. Ne pas vider les autres sections. Ne pas cocher UI Electron. Ne pas committer.

Si un détail UI manque dans le recueil : « I don’t know » dans le CR, ne pas inventer.
Hors périmètre : M.1, M.3, I.1, H.4.
```

---

## LOT-01 — Drawer

```
LOT-01 uniquement. Métier : intégrateur chrome desktop (drawer, navigation, i18n). Pas la carte chronique (Lot 2).

Appliquer le plan « Lot 1 — Drawer ». IDs H.5 H.2 H.3 M.2 M.4. CR § LOT-01.

Pièges :
- Ne pas modifier export.service.ts saveAsObservation.
- H.4 : aucune caption cloud / licence dans CloudLoginDialog.
- Entrée menu = titre de modale : drawer.preferences (plus preferencesDisplay).
```

---

## LOT-01BIS — Indicateur cloud Mon compte

```
LOT-01BIS uniquement. Le Lot 1 est déjà en place. Métier : intégrateur chrome desktop (barre Mon compte). Pas la carte chronique (Lot 2). Pas CloudLoginDialog (H.4).

Appliquer le plan « Lot 1Bis — Indicateur cloud sur Mon compte ». ID H.8. CR § LOT-01BIS.

Pièges :
- Déconnecté : clic icône → openCloud() + @click.stop (pas le menu compte).
- Connecté : pas d’action dédiée sur l’icône. Ne pas modifier CloudLoginDialog (H.4).
- Source : useCloud().sharedState.isAuthenticated (déjà dans le drawer).
- Connecté : mdi-cloud-outline. Déconnecté : mdi-cloud-off-outline. Couleur var(--accent).
```

---

## LOT-02 — Carte Mes chroniques

```
LOT-02 uniquement. Le Lot 1 est déjà en place. Métier : intégrateur UI carte chronique. Pas le drawer.

Appliquer le plan « Lot 2 — Carte Mes chroniques ». IDs H.1 H.6 H.7. CR § LOT-02.

Pièges :
- Ne pas changer les names de routes.
- Ne plus filtrer statistics dans use-chronicle-navigation (carte).
- Retirer @cloud sur ActiveChronicle dans home/Index.vue s’il ne sert plus.
```

---

## LOT-03 — Protocole libellés / grille / CTA

```
LOT-03 uniquement. Métier : intégrateur i18n protocole. Pas le flux d’ajout (Lot 4).

Appliquer le plan « Lot 3 — Protocole : libellés, grille, CTA ». IDs P.1 P.2 P.3 P.7. CR § LOT-03.

Pièges :
- P.1 = overlay front. Ne pas modifier api/.../observation/index.service.ts ('Protocol - ').
- Badge q-tree : ne plus afficher prop.node.action brut.
```

---

## LOT-04 — Protocole inline + D&D

```
LOT-04 uniquement. Le Lot 3 est déjà en place. Métier : développeur interaction protocole.

Appliquer le plan « Lot 4 — Protocole : saisie inline, empty, D&D ». IDs P.4 P.5 P.6 P.8 P.9. CR § LOT-04.

Pièges :
- Pas de nouvelle lib, pas de vuedraggable.
- Ne pas retoucher P.1 P.2 P.3 P.7.
- Edit / Remove / Move peuvent rester ; AddCategory / AddObservable ne sont plus le flux d’ajout.
```

---

## LOT-04BIS — D&D observable vers une autre catégorie

```
LOT-04BIS uniquement. Le Lot 4 est déjà en place. Métier : développeur interaction protocole (D&D + move). Pas l’inline (P.4). Pas Lot 5.

Appliquer le plan « Lot 4Bis — D&D observable vers une autre catégorie ». ID P.10. CR § LOT-04BIS.

Pièges :
- Séquence = modale : deleteItem puis addObservable append. Correctif : passer action et graphPreferences s’ils existent sur le nœud (ne pas envoyer {}).
- POST /item ignore ces champs aujourd’hui : les transmettre dans la branche observable seulement (AddProtocolItemDto.graphPreferences optionnel). Pas d’autre route. Pas de PATCH graph-preferences.
- Rec/stats lisent category.action : la copie n’y change rien. Graphe : conserver color/strokeWidth/backgroundPattern du nœud ; displayMode/supportCategoryId restent à la catégorie.
- Pas d’insert (append). Drop sur un observable d’une autre cat = parentId de cet observable.
- Intra-catégorie : D&D Lot 4 (editProtocolItem + order). Pas de vuedraggable. Pas mobile/ ni packages/.
```

---

## LOT-05 — Observation session

```
LOT-05 uniquement. Métier : développeur observation (Rec / Pause / Terminer). Pas le tableau des relevés (Lot 6).

Appliquer le plan « Lot 5 — Observation : session Rec / Pause / Terminer » (lire « État actuel »). IDs O.1 O.2 O.3 O.5 O.6 O.9 O.11. CR § LOT-05. Tester avec ET sans vidéo.

Pièges :
- ObservationToolbar.vue n’est pas monté : ne pas le ressusciter.
- Pause = pauseTimer (pas de Fin). Terminer = stopTimer + confirmation.
- CalendarToolbar n’existe aujourd’hui que sans vidéo : la barre session doit exister aussi avec vidéo.
```

---

## LOT-06 — Relevés + bannière orphelins

```
LOT-06 uniquement. Métier : développeur table de relevés + alerte orphelins. Pas Rec / Pause / Terminer (Lot 5).

Appliquer le plan « Lot 6 — Observation : relevés + bannière orphelins ». IDs O.4 O.7 O.8 O.10 S.1. CR § LOT-06.

Pièges :
- Cmd/Ctrl+F seulement si le champ recherche a le focus (pas un listener window).
- Un seul composant bannière, branché Observation + Graphe + Stats. Ne pas modifier hasReadingsAfterLastStop dans core.
```

---

## LOT-07 — ExportMenu

```
LOT-07 uniquement. Métier : développeur composant d’export. Pas G.2–G.7 (Lot 8) ni segmented stats (Lot 9).

Appliquer le plan « Lot 7 — ExportMenu partagé ». IDs G.1 E.1 S.4. CR § LOT-07.

Pièges :
- Ne pas changer les formats produits. Réutiliser use-statistics-export.ts et use-chart-image-export.ts.
- Conserver saveImageViaElectron vs téléchargement navigateur.
```

---

## LOT-08 — Graphe affichage

```
LOT-08 uniquement. Le Lot 7 (header export) est déjà en place. Métier : développeur graphe d’activité. Pas ExportMenu.

Appliquer le plan « Lot 8 — Graphe : affichage ». IDs G.2 G.3 G.4 G.5 G.6 G.7. CR § LOT-08.

Pièges :
- Ne pas toucher packages/graph/ ni les enums persistés.
- G.6 : getObservablePropagationPatch + graph-preferences.utils.test.ts. Pas de lib couleur.
- G.7 : i18n patternNone ET fallback durci dans ItemBackgroundPattern.vue.
```

---

## LOT-09 — Statistiques onglets / gouttière

```
LOT-09 uniquement. Lots 6 et 7 déjà en place. Métier : intégrateur statistiques. Pas de recalcul stats.

Appliquer le plan « Lot 9 — Statistiques : onglets et gouttière ». IDs S.2 S.3. CR § LOT-09.

Pièges :
- Ne pas recréer ExportMenu ni la bannière orphelins.
- q-tab-panel q-pa-md ne doit plus décaler la gouttière.
```
