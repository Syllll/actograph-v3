# CR UX desktop — lots Composer

**Auteur** : Morgane Le Moal  
**Date** : 22 septembre 2026  
**Plan** : [20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md](./20260922172000-plan-implementation-ux-desktop-Morgane-Le-Moal.md)  
**Recueil** : [20260922141500-test-manuel-desktop-Morgane-Le-Moal.md](./20260922141500-test-manuel-desktop-Morgane-Le-Moal.md)  
**Prompts** : [20260922172100-prompts-composer-ux-desktop-Morgane-Le-Moal.md](./20260922172100-prompts-composer-ux-desktop-Morgane-Le-Moal.md)

Un fichier, une section par lot. Composer remplit **uniquement** la section du lot en cours. Ne pas recréer ce fichier. Ne pas vider les autres sections. Ne pas committer.

| Section | Prompt | Statut |
|---------|--------|--------|
| [LOT-01](#lot-01) | Drawer | ⏳ |
| [LOT-02](#lot-02) | Carte Mes chroniques | ⏳ |
| [LOT-03](#lot-03) | Protocole libellés | ⏳ |
| [LOT-04](#lot-04) | Protocole inline | ⏳ |
| [LOT-05](#lot-05) | Observation session | ⏳ |
| [LOT-06](#lot-06) | Relevés + orphelins | ⏳ |
| [LOT-07](#lot-07) | ExportMenu | ⏳ |
| [LOT-08](#lot-08) | Graphe affichage | ⏳ |
| [LOT-09](#lot-09) | Stats onglets | ⏳ |

---

## Electron (tous les lots)

Commande (une fois) : `bash scripts/dev-electron.sh` depuis `actograph-v3`. Ne pas modifier le script.  
Contexte : chronique « Ma super chronique », FR, licence étudiante.  
Pas le binaire installé v0.0.178. Pas `dev-web.sh`. Captures du recueil = **avant**.  
Détail : plan, section « Vérification locale ».

Composer **ne coche pas** « UI Electron » — c’est Morgane.

---

## LOT-01

**Statut** : ⏳ à remplir par Composer  
**IDs** : H.5, H.2, H.3, M.2, M.4  
**Métier / rôle** : intégrateur chrome desktop (drawer Quasar, navigation, i18n, design system ActoGraph)

### Livré

- [ ] H.5 Mes chroniques + `mdi-book-multiple`
- [ ] H.2 CTA cloud orange sous Nouvelle / Importer ; Envoyer vers le cloud à côté d’Exporter
- [ ] H.3 Sauvegardes / Aide / Mon compte ; menu dans le drawer ; entrée **Préférences** (= titre de modale, `drawer.preferences`)
- [ ] M.2 Dupliquer (menu, icône, tooltip, titre, CTA, toasts, hint)
- [ ] M.4 Dialog `sm` + champ contenu + focus accent (userspace + dialogs, pas l’admin)

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Tiroir, menu compte (vers le haut), Dupliquer, login cloud.

- Mes chroniques + `mdi-book-multiple`
- CTA cloud orange sous Nouvelle / Importer
- Entrée **Préférences** (pas « Préférences et affichage »)
- Dupliquer `sm`, champ contenu, focus orange
- Login cloud : **pas** de caption « licence étudiante n’inclut pas le cloud »

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Lot 2 (carte) : cloud encore présent sur la carte jusqu’au Lot 2 — attendu.

---

## LOT-02

**Statut** : ⏳ à remplir par Composer  
**IDs** : H.1, H.6, H.7  
**Métier / rôle** : intégrateur UI carte chronique (layout, CTA, design system ActoGraph)

### Livré

- [ ] H.1 Chip mode sur la ligne des métadonnées
- [ ] H.2 (fin) Plus de cloud sur la carte
- [ ] H.6 / H.7 4 CTA dans le bandeau gris, repos, filet accent / fond blanc, icônes + verbes
- [ ] Stats présente ; Graphe / Stats disabled sans relevés
- [ ] `ctaGraph` FR : « graphe »

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Page Mes chroniques, chronique ouverte.

- Chip mode sur la 3e ligne (métadonnées)
- 4 CTA dans le bandeau gris, tous au repos, filet orange / fond blanc
- Plus de cloud sur la carte
- Stats présente ; Graphe / Stats disabled sans relevés

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Aucun bloquant. Lots 3 et 5 peuvent suivre.

---

## LOT-03

**Statut** : ⏳ à remplir par Composer  
**IDs** : P.1, P.2, P.3, P.7  
**Métier / rôle** : intégrateur i18n protocole (libellés métier continue / ponctuelle, grille, navigation)

### Livré

- [ ] P.1 Titre affiché **Protocole - {chronique}** (overlay i18n, pas d’écriture API)
- [ ] P.2 continue / ponctuelle partout (badge inclus)
- [ ] P.3 Noms à gauche, actions alignées à droite
- [ ] P.7 CTA Aller à l’observation (`user_observation`)

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Page Protocole.

- Titre **Protocole - {chronique}**
- Badges / select : continue / ponctuelle (plus de continuous, discrete, « Ponctuel (événement) »)
- Noms à gauche, actions alignées à droite
- CTA Aller à l’observation (navigation, pas Rec)

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Lot 4 remplace le flux d’ajout : les modales Add doivent encore fonctionner après ce lot.

---

## LOT-04

**Statut** : ⏳ à remplir par Composer  
**IDs** : P.4, P.5, P.6, P.8, P.9  
**Métier / rôle** : développeur interaction protocole (saisie inline, empty state, drag and drop sans nouvelle lib)

### Livré

- [ ] P.4 / P.8 Saisie inline nom + description ; Entrée / Échap
- [ ] P.8 Pas de + sur la ligne catégorie
- [ ] P.5 / P.8 Pas de champ ordre à l’ajout
- [ ] P.9 Empty FR + champ première catégorie déjà sur la page
- [ ] P.6 D&D + flèches clavier (pas de nouvelle dépendance)

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Protocole : liste vide, puis ajout, puis réordre.

- Empty FR + champ première catégorie déjà là
- Ajout inline (Entrée / Échap), pas de +, pas de champ ordre
- D&D + flèches clavier

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Aucun bloquant pour le Lot 5. Noter si AddCategoryModal / AddObservableModal sont encore importés à mort.

---

## LOT-05

**Statut** : ⏳ à remplir par Composer  
**IDs** : O.1, O.2, O.3, O.5, O.6, O.9, O.11  
**Métier / rôle** : développeur observation (sémantique Rec / Pause / Terminer, chrome split gauche-droite)

### Livré

- [ ] O.1–O.3 Rec / Pause / Terminer + timer sous le titre gauche (vidéo **et** non-vidéo)
- [ ] O.3 Pause ≠ Terminer (pas de Fin à la pause ; confirmation à Terminer)
- [ ] O.5 Toasts pause / terminée
- [ ] O.6 / O.11 −/+ tooltips ; Détacher sur le cadre ; titres L/R alignés ; Réinitialiser la disposition en libellé
- [ ] O.9 Chip mode masqué après START ; sélecteur conservé avant

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Observation **avec et sans** vidéo.

- Rec / Pause / Terminer + timer sous le titre gauche
- Pause ne écrit pas de Fin ; Terminer confirme
- Chip mode masqué après START
- −/+ tooltips ; Détacher sur le cadre ; titres L/R alignés

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Lot 6 : timer / chip / find_replace encore dans ReadingsToolbar jusqu’au ménage du Lot 6 — noter ce qui reste.

---

## LOT-06

**Statut** : ⏳ à remplir par Composer  
**IDs** : O.4, O.7, O.8, O.10, S.1  
**Métier / rôle** : développeur table de relevés (CRUD UI, recherche / replace, composant d’alerte partagé)

### Livré

- [ ] O.4 Poubelle par ligne ; Tout effacer en bas ; plus de Supprimer (sélection)
- [ ] O.7 Replace dans le champ recherche ; plus de `find_replace` isolé ; Cmd/Ctrl+F
- [ ] O.8 Deux champs date / heure, prepend, Annuler / Valider
- [ ] O.10 Bannière au-dessus du tableau (après titre / actions / recherche)
- [ ] S.1 Un composant branché Observation + Graphe + Stats

### Files affected

<!-- chemins réels, un par ligne — inclure le nouveau composant bannière -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Tableau relevés, puis Graphe et Stats (bannière).

- Poubelle par ligne ; Tout effacer en bas
- Replace dans le champ recherche (Cmd/Ctrl+F)
- Popup date / heure : 2 champs, prepend, Annuler / Valider
- Bannière orphelins au-dessus du tableau (même composant sur Graphe / Stats)

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Lots 7 et 9 consomment la bannière : noter le chemin du composant créé.

---

## LOT-07

**Statut** : ⏳ à remplir par Composer  
**IDs** : G.1 (export), E.1, S.4  
**Métier / rôle** : développeur composant d’export (factorisation UI Graphe / Stats / cartes ; pas les formats métier)

### Livré

- [ ] G.1 Affichage à gauche (− + Ajuster) ; reset avec l’affichage
- [ ] E.1 Icône download à droite, tooltip Exporter, plus de label
- [ ] E.1 `ExportMenu` : radios si besoin ; toggle si ≥ 2 formats ; clic direct si 0 choix
- [ ] S.4 Export de carte hors du plot, en-tête du bloc

### Files affected

<!-- chemins réels — inclure le nouveau ExportMenu.vue -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Graphe, page Stats, une carte de graphique.

- Affichage à gauche (− + Ajuster) ; icône download à droite, tooltip Exporter
- Un seul format → clic = export, pas de menu
- Export de carte hors du plot

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Lot 8 aligne les headers sur ce header. Lot 9 ne doit pas recréer ExportMenu. Noter le chemin du composant.

---

## LOT-08

**Statut** : ⏳ à remplir par Composer  
**IDs** : G.2, G.3, G.4, G.5, G.6, G.7  
**Métier / rôle** : développeur graphe d’activité (préférences visuelles, modes, héritage couleur)

### Livré

- [ ] G.2 Format du temps dans Ajuster l’affichage (axe du temps)
- [ ] G.3 Headers L/R même hauteur, un filet à droite
- [ ] G.4 Icônes de mode sous le titre, continues only
- [ ] G.5 Slider `1 px` — curseur — `10 px`
- [ ] G.6 Une couleur / catégorie à la création ; héritage ; override enfant conservé (tests à jour)
- [ ] G.7 Motif **Uni**

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Graphe + drawer personnalisation.

- Format du temps dans Ajuster l’affichage (plus dans la toolbar)
- Headers L/R alignés, un filet
- Modes icônes sous le titre (continues only)
- Slider `1 px` — `10 px` ; motif **Uni**

Complément : `yarn test` dans `front/` sur `graph-preferences.utils.test.ts` (G.6).

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Aucun bloquant pour le Lot 9. Noter si G.6 n’a pas de palette existante (I don’t know).

---

## LOT-09

**Statut** : ⏳ à remplir par Composer  
**IDs** : S.2, S.3  
**Métier / rôle** : intégrateur statistiques (layout Quasar, segmented control, gouttière)

### Livré

- [ ] S.2 Même gouttière G/D (onglets, export, alerte, cartes)
- [ ] S.3 Segmented control (pills), actif en fond
- [ ] ExportMenu et bannière orphelins réutilisés (pas recréés)

### Files affected

<!-- chemins réels, un par ligne -->

### Écarts / I don’t know

<!-- vide si conforme au recueil -->

### Parcours

Page Statistiques.

- Onglets = pills, actif en fond
- Même gouttière G/D : onglets, export, alerte, cartes
- ExportMenu et bannière orphelins inchangés (Lots 6–7)

### Résultat (Morgane)

- [ ] Non faite
- [ ] Code / grep seulement
- [ ] UI Electron

Cliqué :

Constat :

### Risque pour le lot suivant

Dernier lot. Noter les régressions éventuelles sur ExportMenu (Lot 7) ou la bannière (Lot 6).
