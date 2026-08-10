# Moteur de graphe v2 — architecture et plan

Branche : `feat/graph-engine-v2`  
Statut : **phases 1–4 livrées** (hors slider / annotations / highlight)  
Stack : **PixiJS v8** (conservé)

## Statut d’implémentation (branche)

Livré dans le code :

- [x] `RenderScheduler`, `BaseLayer`, types engine, `DirtyRegistry`
- [x] `axesGraphicsDirty` **supprimé** (remplacé par `DirtyRegistry` / `midDraw`)
- [x] `PatternTextureStore` par instance + bind dans `PixiApp`
- [x] `GraphEngine` + `GraphContext` réel + layers world (Background, Series, Frieze, Pause, Axis)
- [x] `DataArea` réduit à état + hit area (~378 lignes)
- [x] `HoverLayer` dans `overlayRoot` (screen-space, hors viewport)
- [x] `CategoryGraphicsStore` par layer + `destroy()` graphics orphelins
- [x] Purge orphelins dans `setData` (y compris sans readings)
- [x] `destroy` : clear sprites → `evict` store → unbind ; `hoverLayer.destroy()`
- [x] Deadlock draw/scheduler corrigé (`ignoreStale` + anti-réentrance)
- [x] `patternStore.release` à la destruction des TilingSprites
- [x] `ExportPipeline` via `renderer.extract.base64` + `preserveDrawingBuffer: false`
- [x] Double buffer front/back sur `SeriesLayer` et `BackgroundLayer` (full `prepareWorld`)

Dettes acceptées (non bloquantes) :

- [ ] Invalidation fine : `prepareWorld` peint encore tous les world layers (DirtyRegistry prêt, routing partiel à affiner)
- [ ] Double buffer `AxisLayer` / `FriezeLayer` / `PauseOverlayLayer` non fait
- [ ] Export resize temporaire encore utilisé pour la hauteur interactive (capture via extract, plus via `app.canvas.toDataURL`)
- [ ] EventBus typé inter-layers minimal (communication via `GraphContext` pour l’instant)

`PixiApp` reste l’API publique (façade) pour front et mobile.

Hors scope (point 5) : double slider, annotations libres, highlight segment/point.

---

## Objectifs

- Moteur **solide**, structure claire, testable.
- Mises à jour **dynamiques sans temps mort** (pas d’écran blanc / axes vides pendant un redraw).
- **Layers** indépendants qui communiquent via un contexte + bus d’événements typé.
- Couche annotations souris (crosshair) dès maintenant ; surbrillance segment/point plus tard.
- Extensible plus tard (dessins, texte, double slider temporel) **sans** retoucher le cœur.
- API Vue / mobile inchangée au démarrage (`PixiApp` reste une façade).

## Non-objectifs (cette branche / phases 1–4)

- Surbrillance au survol d’un segment / point.
- Double slider / range zoom temporel (contexte futur uniquement).
- Annotation libre (dessin / texte utilisateur).
- Brush / curseurs sur le canvas.
- Changement de librairie de rendu.

**Focus actuel :** solidifier le moteur (layers, scheduler, ownership GPU, updates sans flash). Rien d’autre.

---

## Diagnostic (pourquoi restructurer)

Les bugs récurrents (fond invisible, flicker au hover, `instanceCount`, export faux) partagent la même cause structurelle :

| Symptôme | Cause |
|---|---|
| Axes / fond qui « disparaissent » | `clear` puis rebuild sur la même scène visible + `preserveDrawingBuffer` |
| Hover instable | full draw vs `app.render()` partiel + `axesGraphicsDirty` global |
| `instanceCount` | cache textures motifs **singleton module** + destroy croisé |
| Orphelins après switch chronique | `setData` ne purge pas graphics / tiling sprites |
| Z-order magique | `addChildAt(0)`, `ensureCursorUiOnTop` (`count - 4`) |

`DataArea` + `PixiApp` concentrent trop de responsabilités (données, axes, séries, hover, hit-test, export, WebGL lifecycle).

---

## Architecture cible

### Modules

```
packages/graph/src/
  engine/
    GraphEngine.ts           # orchestrateur (cœur)
    GraphContext.ts          # état partagé read-only pour les layers
    RenderScheduler.ts       # 1 rAF, coalescence, generation
    ViewportController.ts    # pan / zoom caméra / axisStretch
    ExportPipeline.ts        # export offscreen (RenderTexture)
    ContextLifecycle.ts      # WebGL loss/restore, resume
  layers/
    Layer.ts                 # contrat commun
    BackgroundLayer.ts
    SeriesLayer.ts
    FriezeLayer.ts
    PauseOverlayLayer.ts
    AxisLayer.ts
    HoverLayer.ts            # annotations souris (crosshair)
    AnnotationLayer.ts       # HORS SCOPE — placeholder futur seulement
  # time-range / double slider : HORS SCOPE (ne pas créer de modules)
  gpu/
    PatternTextureStore.ts   # cache motifs PAR instance d’engine
  layout/
    LayoutEngine.ts          # géométrie pure (testable)
    ViewportMath.ts          # extrait de viewport.utils
  pixi-app/
    index.ts                 # façade / adapter = API publique actuelle
```

### Hiérarchie Pixi

```
app.stage
├─ viewport                 # transform = pan / zoom caméra
│   └─ plot
│       ├─ worldRoot        # contenu « données » (scalé avec la caméra)
│       │   ├─ BackgroundLayer
│       │   ├─ SeriesLayer
│       │   ├─ FriezeLayer
│       │   └─ PauseOverlayLayer
│       └─ AxisLayer        # labels éventuellement contre-scalés
└─ overlayRoot              # HORS viewport (screen-space)
    └─ HoverLayer           # crosshair + label temps
```

Point clé : **Hover hors du viewport**.  
Plus de conversions fragiles, plus de `ensureCursorUiOnTop` / index magiques.  
(Les overlays futurs type annotation / UI temporelle ne sont **pas** dans le périmètre de renforcement.)

### Flux data → layout → paint

```
setData / setPrefs / resize / hover
        │
        ▼
 LayoutEngine.compute(...)  →  LayoutResult (immuable, versionné)
        │
        ▼
 GraphContext.layout = ...
 layers.invalidate(flag, scope?)
        │
        ▼
 RenderScheduler (1 rAF)
   for each dirty layer (ordre z):
     layer.prepare(ctx)     # CPU : construit back buffer, NE render PAS
   app.render()             # 1 seul commit GPU
```

### Contrat `Layer`

```ts
type DirtyFlag = 'none' | 'layout' | 'data' | 'style' | 'viewport' | 'full';

interface Layer {
  readonly id: string;
  readonly container: Container;
  invalidate(flag: DirtyFlag, scope?: { categoryId?: string }): void;
  isDirty(): boolean;
  prepare(ctx: GraphContext): void;  // jamais app.render()
  // commit optionnel si double-buffer (swap front/back)
}
```

Exemples d’invalidation :

| Action | Layers dirty |
|---|---|
| `setData` | Background, Series, Frieze, Pause, Axis (`data` / `layout`) |
| `redrawCategory(id)` | Series ou Background (scope catégorie) |
| prefs couleur | Series/Background style, scope catégorie |
| pan / zoom caméra | Viewport transform seulement → 1 render, **pas** de rebuild géométrie |
| pointer move | HoverLayer seulement |

### Communication inter-layers

- **GraphContext** : lecture seule (layout, viewport, prefs, observation, `patternStore`).
- **EventBus typé** (pas d’EventEmitter générique) :
  - `viewport:changed`
  - `layout:ready`
  - (plus tard seulement) `timeRange:changed`, `pointer:hover`

Les layers **ne se référencent pas** entre eux (fin du couplage `DataArea → xAxis`).

### Ownership GPU

- `PatternTextureStore` **par** `GraphEngine` (plus de singleton module).
- `acquire` / `release` (refcount) ; `evict()` uniquement à `destroy` ou context loss.
- Chaque layer possède ses Graphics / TilingSprites et les purge dans `prepare('data')`.

### Zero dead-time

1. **Ne jamais clear-then-blank** sur la scène visible.  
   Double buffer `front` / `back` sur les layers lourds (Series, Background, Axis) : l’ancien reste affiché jusqu’au swap.
2. **Generation counter** dans le scheduler : un `setData` plus récent invalide un `prepare` en cours (descend depuis `use-graph.redrawGeneration`).
3. **Un seul point de `app.render()`** : le scheduler. Hover / pan / redrawCategory demandent une frame, ne peignent pas en freestyle.
4. **Export offscreen** (`renderer.extract` sur `app.stage`) : le canvas interactif n’est pas lu via `toDataURL`. `preserveDrawingBuffer: false`.

---

## Hors scope — rappel futur (ne pas implémenter)

Ces idées guident juste l’extensibilité du design ; **aucune story / aucun module** pour elles dans les phases 1–4 :

- Double slider temporel (UI Vue → `setTimeRange` un jour).
- AnnotationLayer (dessins / texte).
- Surbrillance segment / point au hover.

Le renforcement se limite à : layers actuels, scheduler, ownership GPU, updates sans flash, façade `PixiApp` stable.

---

## Plan d’action (phases)

### Phase 0 — Branche + doc (cette PR de design)

- [x] Branche `feat/graph-engine-v2`
- [x] Doc d’architecture (`docs/graph-engine-v2.md`)
- [ ] Validation produit / technique avant code massif

### Phase 1 — Extraction layers + GraphContext + scheduler

**But :** même API `PixiApp`, intérieur en couches. Supprimer `axesGraphicsDirty` et le z-order magique.

1. Introduire `GraphEngine`, `GraphContext`, `RenderScheduler`, `Layer`.
2. Extraire `HoverLayer` **hors viewport**.
3. Extraire `PauseOverlayLayer`, puis Background / Series / Frieze.
4. Extraire `AxisLayer`.
5. `PixiApp` = façade mince vers `GraphEngine`.
6. Purge orphelins dans `prepare('data')` (bug actuel Background→Normal / catégories disparues).

**Done quand :**
- Tests graph existants verts.
- Plus de `ensureCursorUiOnTop` / `count - 4`.
- Plus de `axesGraphicsDirty`.
- Switch chronique + hover + resume desktop/mobile OK visuellement.

**Risque :** conversions hover screen-space ; garder le chemin mobile non-interactif (resize hauteur).

### Phase 2 — GPU ownership

- `PatternTextureStore` par engine.
- Fin du singleton `textureCache`.
- Context loss → `store.invalidateAll()` + invalidate full layers.

**Done quand :** remount / deux engines / restore WebGL sans `instanceCount`.

### Phase 3 — Zero dead-time + export propre

- Double buffer sur layers critiques (`SeriesLayer`, `BackgroundLayer`).
- `ExportPipeline` via `renderer.extract.base64` **avant** de couper `preserveDrawingBuffer`.
- `preserveDrawingBuffer: false`.

**Done quand :** pendant un gros `setData`, l’ancien graphe reste visible ; export ne bloque pas le hover.

**Ordre strict :** export offscreen → puis couper `preserveDrawingBuffer`.

### Phase 4 — Robustesse setData / protocoles

- Tests explicites : catégorie supprimée, switch display mode, protocole différent.
- Snapshot scène (pas de sprites orphelins).

### Phase 5 — reportée (hors renforcement)

Annotation libre, double slider temporel, highlight hover : **pas dans cette branche**.  
À traiter seulement quand le moteur phases 1–4 est stable en prod.

---

## Stratégie de livraison

- **Pas de big-bang** : un layer (ou un contrat) par tranche.
- Façade `PixiApp` jusqu’à fin phase 2 minimum → `use-graph.ts` / mobile intacts.
- Checkpoints :
  - après phase 1 (contrat `Layer` / `GraphContext` figé) ;
  - avant phase 3 (décision `preserveDrawingBuffer`).

## Pièges à éviter

1. Hover sous le viewport (réintroduit toLocal / contre-scale).
2. `app.render()` hors scheduler.
3. Garder le cache motifs global.
4. Couper `preserveDrawingBuffer` avant l’export offscreen.
5. References croisées layers (recréer le couplage DataArea).
6. Ticker Pixi en continu (`autoStart` reste `false`).
7. Oublier le mode non-interactif mobile (hauteur scroll).

## Critères de succès globaux

- Updates dynamiques sans flash blanc / axes vides.
- Hover fluide pendant pan / prefs / switch catégorie.
- Extensibilité : un jour, ajouter un contrôle UI ou un overlay sans patcher DataArea.
- Fin des plantages texture / `instanceCount` liés au cache partagé.
- Export fidèle à la scène logique, pas à un framebuffer stale.

---

## Décision

**Continuer en phase 1** après validation : renforcer uniquement le graphe.  
Pas de rewrite hors Pixi. Pas de slider, brush, highlight ni annotations dans cette livraison.
