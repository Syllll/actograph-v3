# Gestion des pauses

Document de référence pour le comportement des pauses dans ActoGraph v3, tel qu’implémenté sur `main` (après revert de la PR #113 via #115).

Une pause est une **métadonnée temporelle** : elle marque un intervalle « hors enregistrement actif », sans constituer une frontière d’état graphique. Les états continus (Lieu, Action, etc.) **traversent** les pauses ; le graphe les **signale** par un overlay, il ne les coupe pas.

## Invariants

- Pause ≠ STOP. Seul `STOP` clôture la session / coupe un segment continu.
- Les relevés `PAUSE_START` / `PAUSE_END` ne dessinent pas de géométrie et ne scindent pas les segments continus (tous modes, calendrier inclus).
- L’overlay de pause se **superpose** aux segments ; il ne les efface pas.
- Une pause orpheline (`PAUSE_START` sans `PAUSE_END`, ou l’inverse) est ignorée dans les calculs de périodes / stats (durée 0).
- En mode **calendrier**, la pause **verrouille** les boutons d’observables (pas de nouveaux `DATA`).
- En mode **chronomètre**, la pause fige le temps écoulé ; les boutons restent utilisables (relevés au temps figé).
- En mode **chronomètre + vidéo** (`videoPath`), aucun relevé `PAUSE_*` n’est créé automatiquement.

## Modes : calendrier vs chronomètre

| | Calendrier | Chronomètre |
|---|---|---|
| Horloge UI | Heure murale (`now`, 1 s) ; continue pendant la pause ; figée sur l’heure du `STOP` une fois arrêté | `elapsedTime` formaté ; **figé** pendant la pause |
| Voile sur l’horloge | Oui (`timer-paused-veil`) | Non |
| Badge « Enregistrement en cours » | Si `isPlaying` | Idem |
| Badge « En pause » | Si démarré et `!isPlaying` | Idem |
| Relevés `PAUSE_*` | Créés | Créés **sauf** si `videoPath` |
| Horodatage pause / reprise | `currentDate` murale rafraîchie juste avant `PAUSE_START` / `PAUSE_END` | Temps figé (`t0 + elapsed`) ; pas de recalc mural à la reprise |
| Boutons observables | Verrouillés pendant la pause (`isLockedByCalendarPause`) | Actifs (temps figé) |
| Overlay graphe | Oui (si intervalles présents) | Oui (si intervalles présents) |

État runtime : `observation.sharedState.isPlaying` (`front/src/composables/use-observation/index.ts`).  
Pause = observation démarrée (`START` présent ou `elapsedTime > 0`) et `!isPlaying`.

## Relevés

### Types

```typescript
ReadingTypeEnum.PAUSE_START // 'pause_start'
ReadingTypeEnum.PAUSE_END   // 'pause_end'
```

### Création (desktop)

| Action | Méthode | Relevés |
|---|---|---|
| Pause | `pauseTimer()` | `PAUSE_START` via `addPauseStartReading()` |
| Reprise | `startTimer()` (déjà démarré) | `PAUSE_END` via `addPauseEndReading()` |
| Premier démarrage | `startTimer()` | `START` (pas de pause) |
| Stop | `stopTimer()` | `STOP` |

Fichiers :
- `front/src/composables/use-observation/index.ts` (`pauseTimer`, `startTimer`, `togglePlayPause`)
- `front/src/composables/use-observation/use-readings.ts` (`addPauseStartReading`, `addPauseEndReading`)

Early-return si `mode === chronometer && videoPath` (pas de `PAUSE_*` en workflow vidéo).

Noms i18n : `readings.defaultPauseStart` / `readings.defaultPauseEnd`.

### Périodes

`calculatePausePeriods(readings)` (`packages/core/src/statistics/period-calculator.ts`) :
- Apparie séquentiellement chaque `PAUSE_START` au `PAUSE_END` suivant ;
- Ignore les orphelins ;
- Réutilisé par le graphe via `getGraphPausePeriods` (`packages/graph/src/utils/pause-periods.utils.ts`).

### Auto-correction

`packages/core/src/utils/reading-auto-correct.ts` complète les paires de pause manquantes (placeholders synthétiques, localisés côté front).

## UI observation

### Barre d’outils (`CalendarToolbar.vue`)

Composant réellement utilisé pour calendrier **et** chronomètre (`ObservationToolbar.vue` est du code mort, non importé).

- Play / Pause / Stop ;
- Badge rouge « Enregistrement en cours » + bandeau (`toolbar-recording`) si `isPlaying` ;
- Badge ambre « En pause » + icône lock si pause ;
- Mode calendrier : voile sur l’horloge pendant la pause ; horloge figée sur le dernier `STOP` une fois arrêté.

### Boutons observables (`buttons-side/Index.vue`)

- `isLockedByCalendarPause` = pause **et** mode calendrier ;
- Overlay plein panneau (« En pause » / « Relevés verrouillés jusqu’à la reprise ») ;
- Boutons continus et discrets désactivés dans cet état ;
- Chronomètre : pas de verrouillage UI (on peut cliquer au temps figé).

## Graphe

### Segments continus : pas de coupure

Confirmé dans `packages/graph/src/utils/continuous-segments.utils.ts` :
- `shouldSkipInContinuousDraw` ignore `PAUSE_START` / `PAUSE_END` (pas de géométrie, pas de split) ;
- Un segment ne se coupe qu’au `STOP` (ou au prochain `DATA` de nouvelle session après `STOP`) ;
- Scénario `DATA → PAUSE_START → PAUSE_END → DATA` (même observable) = **un** segment continu.

La PR #113 avait introduit une coupure calendrier (`treatPauseAsBoundary`) ; elle a été **revertée** par la PR #115. Ne pas réintroduire cette sémantique : le signal visuel des pauses est l’overlay.

### Overlay

| Élément | Détail |
|---|---|
| Calcul des intervalles | `getGraphPausePeriods` → `calculatePausePeriods` |
| Géométrie | `computePauseOverlayRects` (`pause-overlay.utils.ts`) |
| Rendu | `pauseOverlayGraphic` dans `DataArea` (au-dessus des segments) |
| Style | Gris `0x888888`, alpha `1` (opaque), pleine hauteur de la zone de données |

Option `IGraphRenderOptions.maskPauses` :
- `false` (**défaut actuel**) → overlay **dessiné** (pauses visibles) ;
- `true` → overlay masqué (segments seuls, toujours continus).

Il n’y a **plus** de toggle UI « Masquer les pauses » dans le drawer de personnalisation (retiré) ; l’option reste dans l’API de rendu pour usage programmatique / tests.

## Statistiques

Indépendant du rendu graphique.

- Front : `treatPausesAsSeparateState: true` est **figé** dans `use-statistics` (plus de toggle UI).
- Effet : `includePauses = false` → les durées d’observables **excluent** le chevauchement avec les pauses ; le camembert ajoute un segment « Pause » si `pauseDuration > 0`.
- Core : `calculatePauseOverlap`, `subtractPausesFromPeriods` (`period-calculator.ts`).
- Catégories discrètes : les pauses n’affectent pas le comptage d’occurrences.
- Chronomètre + vidéo : pas de `PAUSE_*` → aucun effet.

Détail historique des calculs : `docs/features/20250115000000-22-23-statistiques-Sylvain-Meylan.md` (certaines mentions de toggles UI y sont obsolètes ; se fier à ce document pour l’état runtime actuel).

## Fichiers clés

```
front/src/composables/use-observation/index.ts
front/src/composables/use-observation/use-readings.ts
front/src/pages/userspace/observation/_components/CalendarToolbar.vue
front/src/pages/userspace/observation/_components/buttons-side/Index.vue
front/src/composables/use-statistics/index.ts
front/src/composables/use-statistics/category-pie-chart.utils.ts

packages/core/src/statistics/period-calculator.ts
packages/core/src/utils/reading-auto-correct.ts

packages/graph/src/utils/continuous-segments.utils.ts
packages/graph/src/utils/pause-periods.utils.ts
packages/graph/src/utils/pause-overlay.utils.ts
packages/graph/src/types/graph-render-options.ts
packages/graph/src/pixi-app/data-area/index.ts
packages/graph/src/pixi-app/index.ts
```

## Ce qui n’est pas le comportement

- **Pas** de coupure des segments continus aux pauses en mode calendrier (revert #115 de #113).
- **Pas** de toggle UI « Masquer les pauses » / `setMaskPauses` (défaut code : overlay visible, `maskPauses: false`).
- **Pas** de toggle UI « Traiter les pauses comme un état séparé » (comportement figé à `true` côté stats).
- Pause ≠ STOP ; l’overlay ne remplace pas / n’efface pas les lignes d’état.
- Chronomètre + vidéo : pause lecture ≠ pause chronique (pas de relevés `PAUSE_*`).

## Voir aussi

- `docs/graph.md` (rendu Pixi, section Pauses renvoyant ici)
- `docs/reading.md` (modèle des relevés)
- `docs/features/20250115000000-22-23-statistiques-Sylvain-Meylan.md`
