# Migration du frontend vers `@actograph/graph`

## 📋 État actuel

| Élément | Frontend (local) | Package |
|---------|------------------|---------|
| PixiApp | `front/src/.../graph/pixi-app/` | `packages/graph/src/pixi-app/` |
| Types | `@services/observations/interface` | `@actograph/core` |
| Utilitaires | `@services/observations/protocol.service` | `packages/graph/src/utils/` |
| Alias configuré | ✅ Oui | ✅ Oui |
| Utilisé | ❌ Non | ✅ Mobile |

## ✅ Prérequis vérifiés

1. **Alias déjà configurés** dans `front/quasar.config.js` :
   - `@actograph/core` → `../packages/core/src`
   - `@actograph/graph` → `../packages/graph/src`

2. **Package complet** avec :
   - `PixiApp` : classe principale
   - `parseProtocolItems` : utilitaire de parsing
   - `getObservableGraphPreferences` : préférences graphiques
   - Tous les composants (axes, data-area, lib)

3. **Types compatibles** entre `@services/observations/interface` et `@actograph/core`

---

## ⚠️ Bug identifié dans le package (à corriger)

### Problème : Incohérence `items` vs `_items`

**Contexte** :
- Frontend : `IProtocol.items` = `string` (JSON), `IProtocol._items` = `IProtocolItem[]` (parsé)
- Package : `IProtocol.items` = `IProtocolItem[]` (déjà tableau)

**Bug dans `packages/graph/src/pixi-app/index.ts`** :
- `setProtocol()` parse `items` (string) → `_items` (tableau) ✅
- `updateObservablePreference()` utilise `this.protocol.items` au lieu de `_items` ❌

**Code actuel (buggé)** :
```typescript
public updateObservablePreference(observableId: string, preference: Partial<IGraphPreferences>) {
  const items = this.protocol.items || [];  // ❌ Bug : items peut être une string
  for (const category of items) { ... }
}
```

**Code corrigé** :
```typescript
public updateObservablePreference(observableId: string, preference: Partial<IGraphPreferences>) {
  const prot = this.protocol as any;
  const items = prot._items || prot.items || [];  // ✅ Utilise _items en priorité
  for (const category of items) { ... }
}
```

---

## 🔧 Étapes d'implémentation

### Étape 1 : Corriger le bug dans le package (OBLIGATOIRE)

**Fichier** : `packages/graph/src/pixi-app/index.ts`

**Modification** (ligne ~121) :
```typescript
// AVANT
const items = this.protocol.items || [];

// APRÈS
const prot = this.protocol as any;
const items = prot._items || prot.items || [];
```

**Impact** : Le package fonctionnera avec les deux formats de protocole :
- Frontend : `_items` (parsé depuis string JSON)
- Mobile : `items` (tableau direct)

---

### Étape 2 : Modifier `use-graph.ts`

**Fichier** : `front/src/pages/userspace/analyse/_components/graph/use-graph.ts`

**Modification** (ligne 2) :
```typescript
// AVANT
import { PixiApp } from './pixi-app';

// APRÈS
import { PixiApp } from '@actograph/graph';
```

**Impact** : Import de `PixiApp` depuis le package partagé au lieu de la version locale.

---

### Étape 3 : Vérifier la compatibilité du canvas

**Contexte** : Le frontend utilise `d-canvas` qui expose `canvasRef.value.canvasRef` (double référence).

**Vérification** dans `use-graph.ts` ligne 71 :
```typescript
await pixiApp.init({
  view: options.init.canvasRef.value.canvasRef, // ← Double référence
});
```

**Le package accepte** `HTMLCanvasElement`, donc **aucune modification nécessaire**.

---

### Étape 4 : Supprimer le code local (après validation)

**Dossier à supprimer** : `front/src/pages/userspace/analyse/_components/graph/pixi-app/`

**Contenu** (7 fichiers) :
```
pixi-app/
├── index.ts                    # PixiApp locale
├── axis/
│   ├── x-axis.ts              # Axe X
│   └── y-axis.ts              # Axe Y
├── data-area/
│   └── index.ts               # Zone de données
└── lib/
    ├── base-graphic.ts        # Classe de base
    ├── base-group.ts          # Groupe de base
    └── pattern-textures.ts    # Textures de motifs
```

---

## 📝 Fichiers modifiés

| Action | Fichier |
|--------|---------|
| **Corriger** | `packages/graph/src/pixi-app/index.ts` (bug `_items`) |
| **Modifier** | `front/src/pages/userspace/analyse/_components/graph/use-graph.ts` |
| **Supprimer** | `front/src/pages/userspace/analyse/_components/graph/pixi-app/` (dossier entier) |

---

## 🔍 Méthodes utilisées par le frontend

| Méthode | Utilisée dans | Package ✅ |
|---------|---------------|-----------|
| `init()` | `use-graph.ts` | ✅ |
| `setData()` | `use-graph.ts` | ✅ |
| `draw()` | `use-graph.ts`, `Index.vue` (drawer) | ✅ |
| `destroy()` | `use-graph.ts` | ✅ |
| `zoomIn()` | `Index.vue` (graph) | ✅ |
| `zoomOut()` | `Index.vue` (graph) | ✅ |
| `resetView()` | `Index.vue` (graph) | ✅ |
| `getZoomLevel()` | `Index.vue` (graph) | ✅ |
| `setProtocol()` | `Index.vue` (drawer) | ✅ |
| `updateObservablePreference()` | `Index.vue` (drawer) | ⚠️ Bug à corriger |

---

## 🧪 Checklist de validation

### Après correction du package (Étape 1)

- [ ] Le mobile fonctionne toujours (pas de régression)

### Après modification de `use-graph.ts` (Étape 2)

- [ ] L'application frontend démarre sans erreur
- [ ] La page d'analyse s'affiche correctement
- [ ] Le graphique se charge avec des données
- [ ] Les axes X et Y s'affichent
- [ ] Les readings sont dessinés
- [ ] Le zoom fonctionne (molette + boutons)
- [ ] Le reset de vue fonctionne
- [ ] Les modes d'affichage fonctionnent (Normal, Background, Frieze)
- [ ] Les motifs (patterns) s'affichent correctement
- [ ] Le pointeur avec lignes pointillées fonctionne
- [ ] Le drawer de personnalisation fonctionne :
  - [ ] Changement de couleur
  - [ ] Changement de mode d'affichage
  - [ ] Changement de motif de fond

### Après suppression du code local (Étape 4)

- [ ] Pas d'erreur de compilation
- [ ] Pas d'import cassé
- [ ] Tout fonctionne comme avant

---

## ⚠️ Points d'attention

### 1. Types compatibles mais différents

Le package utilise `@actograph/core` pour les types, le frontend utilise `@services/observations/interface`.

**Solution** : Garder les imports frontend existants (`@services/observations/interface`) car les types sont structurellement compatibles (duck typing TypeScript).

### 2. Différence `_items` vs `items` (CORRIGÉ)

- Frontend : `IProtocol` a `items?: string` et `_items?: IProtocolItem[]`
- Package : `IProtocol` a `items: IProtocolItem[]`

**Solution** : Le package doit gérer les deux cas via `prot._items || prot.items || []`.

### 3. Pas de modification du composant `Index.vue`

Le composant `Index.vue` utilise `useGraph` qui expose `sharedState.pixiApp`. L'interface publique de `PixiApp` est identique.

---

## 📦 Commandes de test

```bash
# Tester le frontend
docker compose --env-file ./front/docker/../.env -f ./front/docker/docker-compose.dev.yml exec actograph-v3-front-dev yarn dev

# Tester le mobile (si applicable)
cd mobile && yarn dev
```

---

## 🚀 Résumé des changements

### 1. Correction du package (obligatoire)
```diff
# packages/graph/src/pixi-app/index.ts (ligne ~121)

- const items = this.protocol.items || [];
+ const prot = this.protocol as any;
+ const items = prot._items || prot.items || [];
```

### 2. Migration du frontend
```diff
# front/src/pages/userspace/analyse/_components/graph/use-graph.ts

- import { PixiApp } from './pixi-app';
+ import { PixiApp } from '@actograph/graph';
```

### 3. Nettoyage
```bash
rm -rf front/src/pages/userspace/analyse/_components/graph/pixi-app/
```
