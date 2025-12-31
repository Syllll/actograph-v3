# Mode Édition des Positions de Catégories (Mobile)

## Résumé

Implémenter un mode édition sur mobile permettant de repositionner les catégories par drag & drop. Les positions sont persistées localement dans SQLite et importées/exportées via le format `.jchronic`.

**Décisions prises** :
- ✅ Option C : Mode édition séparé (pas de drag en mode normal)
- ✅ Les catégories ne sont draggables QUE pendant le mode édition
- ✅ Grille par défaut comme fallback pour les positions
- ✅ Seul le format jchronic (v3) est concerné (pas chronic v1)

---

## Table des matières

1. [État actuel](#1-état-actuel)
2. [Architecture cible](#2-architecture-cible)
3. [Tâches détaillées](#3-tâches-détaillées)
4. [Tests](#4-tests)
5. [Checklist](#5-checklist)
6. [Améliorations et points d'attention](#6-améliorations-et-points-dattention)

---

## 1. État actuel

### 1.1 Front Web (référence)

Le front web a déjà cette fonctionnalité :

**Stockage des positions** :
```typescript
// Dans Protocol.items (JSON stringifié dans la BDD)
{
  type: 'category',
  id: 'uuid-xxx',
  name: 'Ma Catégorie',
  meta: {
    position: { x: 100, y: 200 }
  },
  children: [...]
}
```

**Composants impliqués** :
- `front/src/pages/userspace/observation/_components/buttons-side/Category.vue` : Gère le drag avec mouse/touch events
- `front/src/pages/userspace/observation/_components/buttons-side/Index.vue` : Maintient l'état `categoryPositions`, charge depuis `meta.position`, sauvegarde via API

**Flux de données** :
1. Au chargement → lit `category.meta.position` ou calcule grille par défaut
2. Pendant le drag → met à jour `state.categoryPositions[id]` en temps réel
3. À la fin du drag → sauvegarde via `protocol.methods.editProtocolItem({ meta: { position } })`

### 1.2 Mobile (état actuel)

**Schéma SQLite** (`mobile/src/database/sqlite.service.ts`) :
```sql
CREATE TABLE IF NOT EXISTS protocol_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol_id INTEGER NOT NULL,
  parent_id INTEGER,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('category', 'observable')),
  color TEXT,
  action TEXT,
  display_mode TEXT,
  background_pattern TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  -- ⚠️ PAS de champ 'meta' !
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES protocol_items(id) ON DELETE CASCADE
);
```

**Affichage actuel** (`mobile/src/pages/observation/Index.vue`) :
- Grille CSS statique (`.categories-grid`)
- Pas de drag & drop
- Pas de positions personnalisées

**Interface repository** (`mobile/src/database/repositories/protocol.repository.ts`) :
```typescript
export interface IProtocolItemEntity extends IBaseEntity {
  protocol_id: number;
  parent_id: number | null;
  name: string;
  type: 'category' | 'observable';
  color?: string;
  action?: string;
  display_mode?: string;
  background_pattern?: string;
  sort_order: number;
  // ⚠️ PAS de champ 'meta' !
}
```

### 1.3 Import jchronic

**Format supporté** (`packages/core/src/import/types.ts`) :
```typescript
export interface IJchronicProtocolItem {
  type: string;
  name: string;
  description?: string;
  action?: string;
  order?: number;
  meta?: Record<string, unknown>;  // ✅ Meta existe dans le format
  children?: IJchronicProtocolItem[];
}

export interface INormalizedCategory {
  name: string;
  description?: string;
  order?: number;
  // ⚠️ PAS de champ 'meta' dans le format normalisé !
  observables?: INormalizedObservable[];
}
```

**Problème** : Le `meta` est parsé depuis le fichier jchronic mais n'est PAS transmis dans le format normalisé, donc perdu lors de l'import.

---

## 2. Architecture cible

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAGE OBSERVATION MOBILE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐     │
│  │       MODE NORMAL           │    │       MODE ÉDITION          │     │
│  │  ─────────────────────────  │    │  ─────────────────────────  │     │
│  │  • Grille CSS statique      │    │  • Positions absolues       │     │
│  │  • Clics sur observables    │    │  • Drag & drop catégories   │     │
│  │  • Enregistrement possible  │    │  • Enregistrement bloqué    │     │
│  │  • [Bouton "Éditer"] →      │────│→ [Bouton "Terminer"] →      │     │
│  │                             │    │  • [Bouton "Reset"]         │     │
│  └─────────────────────────────┘    └─────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  SQLite: protocol_items.meta = '{"position":{"x":100,"y":200}}'         │
│                                                                          │
│  Export jchronic: meta.position préservé                                │
│  Import jchronic: meta.position restauré                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flux de données

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SQLite     │────▶│  useChronicle│────▶│ useEditMode  │
│ protocol_items│     │  (lecture)   │     │ (positions)  │
│   .meta      │     └──────────────┘     └──────────────┘
└──────────────┘                                  │
       ▲                                          │
       │                                          ▼
       │                                 ┌──────────────┐
       │                                 │   Template   │
       │                                 │ (affichage)  │
       │                                 └──────────────┘
       │                                          │
       │            Drag end                      │
       └──────────────────────────────────────────┘
```

### 2.3 Structure des fichiers à créer/modifier

```
mobile/src/
├── composables/
│   ├── index.ts                          # MODIFIER : exporter useEditMode
│   └── use-edit-mode/
│       └── index.ts                      # CRÉER : composable mode édition
├── components/
│   └── DraggableCategory.vue             # CRÉER : composant draggable
├── database/
│   ├── sqlite.service.ts                 # MODIFIER : migration 002
│   └── repositories/
│       └── protocol.repository.ts        # MODIFIER : gérer meta
├── services/
│   └── import.service.ts                 # MODIFIER : passer meta
└── pages/
    └── observation/
        └── Index.vue                     # MODIFIER : intégrer mode édition

packages/core/src/import/
├── types.ts                              # MODIFIER : ajouter meta à INormalizedCategory
└── jchronic-parser.ts                    # MODIFIER : préserver meta
```

---

## 3. Tâches détaillées

### 3.1 Migration SQLite : Ajouter colonne `meta`

**Fichier** : `mobile/src/database/sqlite.service.ts`

**Objectif** : Ajouter une colonne `meta` (TEXT) à la table `protocol_items` pour stocker les métadonnées JSON dont la position.

**Code à ajouter** :

```typescript
/**
 * Migration 002: Add meta column to protocol_items
 * 
 * La colonne meta stocke un JSON avec des métadonnées diverses,
 * notamment la position des catégories : { position: { x: number, y: number } }
 */
private async migration_002_add_meta_field(): Promise<void> {
  if (!this.db) return;

  try {
    // Vérifier si la colonne existe déjà (idempotence)
    const tableInfo = await this.db.query('PRAGMA table_info(protocol_items)');
    const hasMetaColumn = tableInfo.values?.some(
      (row: unknown[]) => row[1] === 'meta'
    );

    if (!hasMetaColumn) {
      await this.db.execute('ALTER TABLE protocol_items ADD COLUMN meta TEXT');
      console.log('Migration 002: Added meta column to protocol_items');
    } else {
      console.log('Migration 002: meta column already exists, skipping');
    }
  } catch (error) {
    console.error('Migration 002 failed:', error);
    throw error;
  }
}
```

**Modifier `runMigrations()`** :

```typescript
private async runMigrations(): Promise<void> {
  if (!this.db) return;

  console.log('Running database migrations...');
  
  // Migration 001: Initial schema
  await this.migration_001_initial_schema();
  
  // Migration 002: Add meta field to protocol_items
  await this.migration_002_add_meta_field();

  console.log('Database migrations completed. Current version: 2');
}
```

**Tests à effectuer** :
- [ ] Nouvelle installation : la colonne meta est créée
- [ ] Mise à jour : la colonne meta est ajoutée sans perte de données
- [ ] Double exécution : pas d'erreur si la colonne existe déjà

---

### 3.2 Repository : Gérer le champ `meta`

**Fichier** : `mobile/src/database/repositories/protocol.repository.ts`

**Objectif** : Permettre la lecture et l'écriture du champ `meta` dans les protocol items.

#### 3.2.1 Mettre à jour l'interface

```typescript
export interface IProtocolItemEntity extends IBaseEntity {
  protocol_id: number;
  parent_id: number | null;
  name: string;
  type: 'category' | 'observable';
  color?: string;
  action?: string;
  display_mode?: string;
  background_pattern?: string;
  sort_order: number;
  meta?: Record<string, unknown> | null;  // ← AJOUTER
}
```

#### 3.2.2 Mettre à jour `mapItem()` pour parser le JSON

Dans la fonction `getProtocolItems()`, modifier `mapItem()` :

```typescript
const mapItem = (raw: Record<string, unknown>): IProtocolItemEntity | null => {
  // ... code existant pour les autres champs ...
  
  // Récupérer le champ meta (peut être sous différents formats selon SQLite)
  const metaRaw = raw.meta ?? raw.META;
  
  // Parser le JSON meta si présent
  let meta: Record<string, unknown> | null = null;
  if (metaRaw && typeof metaRaw === 'string') {
    try {
      meta = JSON.parse(metaRaw);
    } catch (e) {
      console.warn('Failed to parse meta JSON:', metaRaw);
      meta = null;
    }
  }

  // ... validation existante ...

  return {
    id: Number(id),
    protocol_id: Number(protocolId),
    parent_id: normalizeParentId(parentId as string | number | null | undefined),
    name: String(name),
    type: String(type) as 'category' | 'observable',
    color: color ? String(color) : undefined,
    action: action ? String(action) : undefined,
    display_mode: displayMode ? String(displayMode) : undefined,
    background_pattern: backgroundPattern ? String(backgroundPattern) : undefined,
    sort_order: Number(sortOrder),
    created_at: createdAt ? String(createdAt) : undefined,
    updated_at: updatedAt ? String(updatedAt) : undefined,
    meta,  // ← AJOUTER
  };
};
```

#### 3.2.3 Mettre à jour `addCategory()` pour accepter meta

```typescript
/**
 * Add a category to protocol
 * 
 * @param protocolId - ID du protocole parent
 * @param name - Nom de la catégorie
 * @param sortOrder - Ordre d'affichage (default: 0)
 * @param action - Type d'action: 'continuous' | 'discrete' (default: 'continuous')
 * @param meta - Métadonnées optionnelles (ex: { position: { x, y } })
 */
async addCategory(
  protocolId: number,
  name: string,
  sortOrder = 0,
  action = 'continuous',
  meta?: Record<string, unknown> | null
): Promise<IProtocolItemEntity> {
  // Sérialiser meta en JSON si présent
  const metaJson = meta ? JSON.stringify(meta) : null;
  
  const sql = `
    INSERT INTO protocol_items (protocol_id, parent_id, name, type, action, sort_order, meta)
    VALUES (?, NULL, ?, 'category', ?, ?, ?)
  `;
  const result = await sqliteService.run(sql, [protocolId, name, action, sortOrder, metaJson]);

  const created = await sqliteService.query<IProtocolItemEntity>(
    'SELECT * FROM protocol_items WHERE id = ?',
    [result.lastId]
  );
  
  // Parser le meta du résultat
  if (created[0] && typeof created[0].meta === 'string') {
    try {
      created[0].meta = JSON.parse(created[0].meta);
    } catch {
      created[0].meta = null;
    }
  }
  
  return created[0];
}
```

#### 3.2.4 Mettre à jour `updateItem()` pour inclure meta

```typescript
/**
 * Update protocol item
 * 
 * @param itemId - ID de l'item à mettre à jour
 * @param data - Données à mettre à jour (partielles)
 */
async updateItem(
  itemId: number,
  data: Partial<Pick<IProtocolItemEntity, 'name' | 'color' | 'action' | 'display_mode' | 'background_pattern' | 'sort_order' | 'meta'>>
): Promise<IProtocolItemEntity | null> {
  // Préparer les mises à jour
  const updates: Record<string, unknown> = { 
    ...data, 
    updated_at: new Date().toISOString() 
  };
  
  // Sérialiser meta en JSON si présent
  if (data.meta !== undefined) {
    updates.meta = data.meta ? JSON.stringify(data.meta) : null;
  }
  
  const columns = Object.keys(updates);
  const setClause = columns.map((col) => `${col} = ?`).join(', ');
  const values = [...Object.values(updates), itemId];

  const sql = `UPDATE protocol_items SET ${setClause} WHERE id = ?`;
  await sqliteService.run(sql, values);

  const updated = await sqliteService.query<Record<string, unknown>>(
    'SELECT * FROM protocol_items WHERE id = ?',
    [itemId]
  );
  
  if (!updated[0]) return null;
  
  // Parser le meta du résultat
  const result = updated[0] as IProtocolItemEntity;
  if (typeof result.meta === 'string') {
    try {
      result.meta = JSON.parse(result.meta);
    } catch {
      result.meta = null;
    }
  }
  
  return result;
}
```

#### 3.2.5 Ajouter une méthode dédiée pour la position (optionnel mais recommandé)

```typescript
/**
 * Update the position of a category
 * 
 * Cette méthode met à jour uniquement le champ meta.position
 * sans écraser les autres métadonnées.
 * 
 * @param categoryId - ID de la catégorie
 * @param position - Nouvelle position { x: number, y: number }
 */
async updateCategoryPosition(
  categoryId: number,
  position: { x: number; y: number }
): Promise<IProtocolItemEntity | null> {
  // Récupérer l'item actuel pour préserver les autres meta
  const current = await sqliteService.query<Record<string, unknown>>(
    'SELECT meta FROM protocol_items WHERE id = ?',
    [categoryId]
  );
  
  if (!current[0]) return null;
  
  // Parser l'ancien meta
  let existingMeta: Record<string, unknown> = {};
  if (current[0].meta && typeof current[0].meta === 'string') {
    try {
      existingMeta = JSON.parse(current[0].meta);
    } catch {
      existingMeta = {};
    }
  }
  
  // Merger avec la nouvelle position
  const newMeta = {
    ...existingMeta,
    position,
  };
  
  return this.updateItem(categoryId, { meta: newMeta });
}
```

**Tests à effectuer** :
- [ ] Création de catégorie avec meta : meta est bien stocké
- [ ] Lecture de catégorie : meta est bien parsé en objet
- [ ] Mise à jour de meta : anciennes valeurs préservées
- [ ] Catégorie sans meta : retourne null/undefined sans erreur

---

### 3.3 Composable `useEditMode`

**Fichier à créer** : `mobile/src/composables/use-edit-mode/index.ts`

**Objectif** : Gérer l'état du mode édition, les positions des catégories, et les interactions de drag.

```typescript
/**
 * Composable for managing the edit mode of category positions.
 * 
 * This composable handles:
 * - Edit mode toggle (enter/exit)
 * - Category positions state
 * - Drag & drop state
 * - Position persistence to SQLite
 * 
 * Usage:
 * ```typescript
 * const editMode = useEditMode();
 * 
 * // Initialize when categories are loaded
 * editMode.methods.initializePositions(categories);
 * 
 * // Toggle edit mode
 * editMode.methods.enterEditMode();
 * editMode.methods.exitEditMode();
 * 
 * // In template
 * <div :style="editMode.methods.getCategoryStyle(category.id)">
 * ```
 */

import { reactive, computed } from 'vue';
import { protocolRepository, type IProtocolItemWithChildren } from '@database/repositories/protocol.repository';

// ============================================================================
// Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

interface EditModeState {
  /** Whether edit mode is currently active */
  isEditing: boolean;
  /** Position of each category by ID */
  categoryPositions: Record<number, Position>;
  /** Whether a category is currently being dragged */
  isDragging: boolean;
  /** ID of the category being dragged (null if none) */
  draggingCategoryId: number | null;
  /** Whether there are unsaved position changes */
  hasUnsavedChanges: boolean;
  /** Whether positions are being saved */
  isSaving: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Grid configuration for default category positions
 */
export const GRID_CONFIG = {
  /** Width of each column (card width + horizontal gap) */
  columnWidth: 170,
  /** Height of each row (approximate card height + vertical gap) */
  rowHeight: 200,
  /** Maximum number of columns (2 for mobile portrait) */
  maxColumns: 2,
  /** Padding from container edges */
  padding: 16,
  /** Minimum margin from edges during drag */
  minMargin: 10,
  /** Card dimensions */
  cardWidth: 150,
  cardHeight: 100,
};

// ============================================================================
// Shared State
// ============================================================================

/**
 * Shared state across all useEditMode instances.
 * Using shared state allows multiple components to access the same edit mode.
 */
const sharedState = reactive<EditModeState>({
  isEditing: false,
  categoryPositions: {},
  isDragging: false,
  draggingCategoryId: null,
  hasUnsavedChanges: false,
  isSaving: false,
});

// ============================================================================
// Composable
// ============================================================================

export function useEditMode() {
  // --------------------------------------------------------------------------
  // Computed
  // --------------------------------------------------------------------------

  /** Whether edit mode can be entered (not recording, etc.) */
  const canEnterEditMode = computed(() => !sharedState.isEditing);

  /** Whether there are unsaved changes that need saving */
  const needsSave = computed(() => sharedState.hasUnsavedChanges && !sharedState.isSaving);

  // --------------------------------------------------------------------------
  // Methods
  // --------------------------------------------------------------------------

  const methods = {
    /**
     * Initialize positions for all categories.
     * 
     * Uses stored position from meta.position if available,
     * otherwise calculates a default grid position.
     * 
     * Also cleans up positions for categories that no longer exist.
     * 
     * @param categories - List of categories to initialize
     */
    initializePositions: (categories: IProtocolItemWithChildren[]) => {
      // Clean up positions for categories that no longer exist
      const categoryIds = new Set(categories.map(c => c.id));
      Object.keys(sharedState.categoryPositions).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categoryPositions[id];
        }
      });

      let row = 0;
      let column = 0;

      categories.forEach((category) => {
        // Priority 1: Use stored position from meta (with validation)
        const storedPosition = category.meta?.position as Position | undefined;
        
        // Validate stored position
        if (
          storedPosition && 
          typeof storedPosition === 'object' &&
          typeof storedPosition.x === 'number' &&
          typeof storedPosition.y === 'number' &&
          !isNaN(storedPosition.x) &&
          !isNaN(storedPosition.y) &&
          storedPosition.x >= 0 &&
          storedPosition.y >= 0
        ) {
          sharedState.categoryPositions[category.id] = {
            x: storedPosition.x,
            y: storedPosition.y,
          };
        } else {
          // Priority 2: Calculate grid position
          sharedState.categoryPositions[category.id] = {
            x: column * GRID_CONFIG.columnWidth + GRID_CONFIG.padding,
            y: row * GRID_CONFIG.rowHeight + GRID_CONFIG.padding,
          };
        }

        // Move to next grid cell
        column++;
        if (column >= GRID_CONFIG.maxColumns) {
          column = 0;
          row++;
        }
      });

      // Reset unsaved changes flag since we just loaded
      sharedState.hasUnsavedChanges = false;
    },

    /**
     * Enter edit mode.
     * 
     * In edit mode:
     * - Categories become draggable
     * - Recording is disabled
     * - Positions can be modified
     */
    enterEditMode: () => {
      sharedState.isEditing = true;
      sharedState.hasUnsavedChanges = false;
    },

    /**
     * Exit edit mode and save positions if needed.
     * 
     * This will:
     * 1. Save all positions to SQLite if there are changes
     * 2. Reset drag state
     * 3. Exit edit mode
     */
    exitEditMode: async () => {
      // Save positions if there are unsaved changes
      if (sharedState.hasUnsavedChanges) {
        await methods.saveAllPositions();
      }

      // Reset state
      sharedState.isEditing = false;
      sharedState.isDragging = false;
      sharedState.draggingCategoryId = null;
    },

    /**
     * Cancel edit mode without saving changes.
     * 
     * This discards any position changes made during edit mode.
     * Call initializePositions() after this to restore original positions.
     */
    cancelEditMode: () => {
      sharedState.isEditing = false;
      sharedState.isDragging = false;
      sharedState.draggingCategoryId = null;
      sharedState.hasUnsavedChanges = false;
    },

    /**
     * Update the position of a category during drag.
     * 
     * @param categoryId - ID of the category being moved
     * @param position - New position { x, y }
     */
    updateCategoryPosition: (categoryId: number, position: Position) => {
      sharedState.categoryPositions[categoryId] = position;
      sharedState.hasUnsavedChanges = true;
    },

    /**
     * Save all category positions to SQLite.
     * 
     * This persists the current positions in the meta.position field
     * of each category in the database.
     * 
     * ⚠️ IMPORTANT: Does NOT reset hasUnsavedChanges on error to allow retry.
     */
    saveAllPositions: async () => {
      if (sharedState.isSaving) return;

      sharedState.isSaving = true;

      try {
        const promises = Object.entries(sharedState.categoryPositions).map(
          async ([categoryIdStr, position]) => {
            const categoryId = Number(categoryIdStr);
            await protocolRepository.updateCategoryPosition(categoryId, position);
          }
        );

        await Promise.all(promises);
        sharedState.hasUnsavedChanges = false;
        console.log('All category positions saved successfully');
      } catch (error) {
        console.error('Failed to save category positions:', error);
        // Ne pas réinitialiser hasUnsavedChanges pour permettre retry
        throw error; // Propager pour affichage dans l'UI
      } finally {
        sharedState.isSaving = false;
      }
    },

    /**
     * Reset all categories to default grid positions.
     * 
     * This discards custom positions and arranges categories
     * in a standard grid layout.
     * 
     * @param categories - List of categories to reset
     */
    resetPositions: (categories: IProtocolItemWithChildren[]) => {
      let row = 0;
      let column = 0;

      categories.forEach((category) => {
        sharedState.categoryPositions[category.id] = {
          x: column * GRID_CONFIG.columnWidth + GRID_CONFIG.padding,
          y: row * GRID_CONFIG.rowHeight + GRID_CONFIG.padding,
        };

        column++;
        if (column >= GRID_CONFIG.maxColumns) {
          column = 0;
          row++;
        }
      });

      sharedState.hasUnsavedChanges = true;
    },

    /**
     * Get CSS styles for a category in edit mode.
     * 
     * Returns absolute positioning styles based on the category's
     * current position in the edit state.
     * 
     * @param categoryId - ID of the category
     * @returns CSS style object for positioning
     */
    getCategoryStyle: (categoryId: number): Record<string, string | number> => {
      const position = sharedState.categoryPositions[categoryId] || { x: 0, y: 0 };
      const isDraggingThis = sharedState.draggingCategoryId === categoryId;

      return {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${GRID_CONFIG.cardWidth}px`,
        // Disable transition during drag for smooth movement
        transition: sharedState.isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        // Bring dragged item to front
        zIndex: isDraggingThis ? 100 : 1,
        // Visual feedback for dragged item
        transform: isDraggingThis ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isDraggingThis 
          ? '0 8px 24px rgba(0, 0, 0, 0.2)' 
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
      };
    },

    /**
     * Calculate the minimum container height needed to fit all categories.
     * 
     * @returns Minimum height in pixels
     */
    getMinContainerHeight: (): number => {
      let maxBottom = 0;

      Object.values(sharedState.categoryPositions).forEach((position) => {
        const bottom = position.y + GRID_CONFIG.cardHeight;
        if (bottom > maxBottom) {
          maxBottom = bottom;
        }
      });

      // Add padding at bottom
      return maxBottom + GRID_CONFIG.padding * 2;
    },

    // ------------------------------------------------------------------------
    // Drag Handlers
    // ------------------------------------------------------------------------

    /**
     * Called when drag starts on a category.
     * 
     * @param categoryId - ID of the category being dragged
     */
    startDrag: (categoryId: number) => {
      sharedState.isDragging = true;
      sharedState.draggingCategoryId = categoryId;
    },

    /**
     * Called when drag ends.
     */
    endDrag: () => {
      sharedState.isDragging = false;
      sharedState.draggingCategoryId = null;
    },

    /**
     * Constrain a position within container bounds.
     * 
     * @param position - Position to constrain
     * @param containerBounds - Container dimensions
     * @returns Constrained position
     */
    constrainPosition: (
      position: Position,
      containerBounds: { width: number; height: number }
    ): Position => {
      const { cardWidth, cardHeight, minMargin } = GRID_CONFIG;

      return {
        x: Math.max(
          minMargin,
          Math.min(position.x, containerBounds.width - cardWidth - minMargin)
        ),
        y: Math.max(
          minMargin,
          Math.min(position.y, containerBounds.height - cardHeight - minMargin)
        ),
      };
    },
  };

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    sharedState,
    GRID_CONFIG,
    canEnterEditMode,
    needsSave,
    methods,
  };
}
```

**Exporter le composable** dans `mobile/src/composables/index.ts` :

```typescript
export { useObservation } from './use-observation';
export { useGraph } from './use-graph';
export { useChronicle } from './use-chronicle';
export { useEditMode } from './use-edit-mode';  // ← AJOUTER
```

---

### 3.4 Composant `DraggableCategory`

**Fichier à créer** : `mobile/src/components/DraggableCategory.vue`

**Objectif** : Composant de catégorie draggable par touch events.

```vue
<template>
  <q-card
    class="draggable-category"
    :class="{
      'is-dragging': state.isDragging,
    }"
    @touchstart.prevent="methods.handleTouchStart"
    @touchmove.prevent="methods.handleTouchMove"
    @touchend="methods.handleTouchEnd"
    @touchcancel="methods.handleTouchEnd"
  >
    <!-- Header avec icône de drag -->
    <q-card-section class="category-header q-py-xs q-px-sm">
      <div class="row items-center no-wrap">
        <q-icon 
          name="mdi-drag" 
          class="drag-handle q-mr-xs" 
          size="20px"
          color="white"
        />
        <div class="category-name text-subtitle2 text-weight-medium ellipsis">
          {{ category.name }}
        </div>
      </div>
    </q-card-section>

    <!-- Contenu : liste des observables -->
    <q-card-section class="category-content q-py-sm q-px-sm">
      <div v-if="computedState.childrenCount > 0" class="observables-preview">
        <div 
          v-for="(child, index) in computedState.visibleChildren" 
          :key="child.id"
          class="observable-chip text-caption ellipsis"
        >
          {{ child.name }}
        </div>
        <div 
          v-if="computedState.hiddenCount > 0" 
          class="text-caption text-grey-6"
        >
          +{{ computedState.hiddenCount }} autres
        </div>
      </div>
      <div v-else class="text-caption text-grey-6 text-center">
        Aucun observable
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, type PropType } from 'vue';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  startTouch: Position;
  initialPosition: Position;
}

export default defineComponent({
  name: 'DraggableCategory',

  props: {
    /**
     * The category data to display
     */
    category: {
      type: Object as PropType<IProtocolItemWithChildren>,
      required: true,
    },
    /**
     * Current position of the category
     */
    position: {
      type: Object as PropType<Position>,
      required: true,
    },
    /**
     * Bounds of the container for constraining drag
     */
    containerBounds: {
      type: Object as PropType<{ width: number; height: number }>,
      default: () => ({ width: 400, height: 800 }),
    },
  },

  emits: {
    /**
     * Emitted when drag starts
     * @param categoryId - ID of the category
     */
    dragStart: (categoryId: number) => typeof categoryId === 'number',
    
    /**
     * Emitted during drag with new position
     * @param payload - { categoryId, position }
     */
    dragMove: (payload: { categoryId: number; position: Position }) => true,
    
    /**
     * Emitted when drag ends
     * @param categoryId - ID of the category
     */
    dragEnd: (categoryId: number) => typeof categoryId === 'number',
  },

  setup(props, { emit }) {
    // ========================================================================
    // State
    // ========================================================================

    const state = reactive<DragState>({
      isDragging: false,
      startTouch: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 },
    });

    // ========================================================================
    // Computed
    // ========================================================================

    const computedState = {
      /** Number of children (observables) */
      childrenCount: computed(() => props.category.children?.length || 0),
      
      /** First 3 children to show */
      visibleChildren: computed(() => 
        (props.category.children || []).slice(0, 3)
      ),
      
      /** Number of hidden children */
      hiddenCount: computed(() => 
        Math.max(0, (props.category.children?.length || 0) - 3)
      ),
    };

    // ========================================================================
    // Methods
    // ========================================================================

    const methods = {
      /**
       * Handle touch start - begin drag
       */
      handleTouchStart: (event: TouchEvent) => {
        const touch = event.touches[0];
        
        state.isDragging = true;
        state.startTouch = { 
          x: touch.clientX, 
          y: touch.clientY 
        };
        state.initialPosition = { ...props.position };
        
        emit('dragStart', props.category.id);
      },

      /**
       * Handle touch move - update position
       * 
       * ⚠️ PERFORMANCE: Les événements touchmove peuvent être très fréquents.
       * Un throttle est appliqué pour limiter à ~60fps (16ms).
       */
      handleTouchMove: (() => {
        let lastCall = 0;
        const throttleMs = 16; // ~60fps

        return (event: TouchEvent) => {
          if (!state.isDragging) return;

          const now = Date.now();
          if (now - lastCall < throttleMs) return;
          lastCall = now;

          const touch = event.touches[0];
          
          // Calculate delta from start position
          const deltaX = touch.clientX - state.startTouch.x;
          const deltaY = touch.clientY - state.startTouch.y;

          // Calculate new position
          let newX = state.initialPosition.x + deltaX;
          let newY = state.initialPosition.y + deltaY;

          // Constrain to container bounds
          const cardWidth = 150;
          const cardHeight = 100;
          const margin = 10;

          newX = Math.max(
            margin, 
            Math.min(newX, props.containerBounds.width - cardWidth - margin)
          );
          newY = Math.max(
            margin, 
            Math.min(newY, props.containerBounds.height - cardHeight - margin)
          );

          emit('dragMove', {
            categoryId: props.category.id,
            position: { x: newX, y: newY },
          });
        };
      })(),

      /**
       * Handle touch end - finish drag
       */
      handleTouchEnd: () => {
        if (!state.isDragging) return;
        
        state.isDragging = false;
        emit('dragEnd', props.category.id);
      },
    };

    // ========================================================================
    // Return
    // ========================================================================

    return {
      state,
      computedState,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.draggable-category {
  touch-action: none;
  user-select: none;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  
  // Visual feedback for drag state
  &.is-dragging {
    opacity: 0.95;
    
    .drag-handle {
      color: var(--q-accent) !important;
    }
  }

  .category-header {
    background: var(--q-primary);
    color: white;
    min-height: 32px;
  }

  .category-name {
    flex: 1;
    min-width: 0; // Enable text truncation
  }

  .drag-handle {
    cursor: grab;
    opacity: 0.8;
    
    &:active {
      cursor: grabbing;
    }
  }

  .category-content {
    min-height: 60px;
  }

  .observables-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .observable-chip {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 8px;
    border-radius: 4px;
    max-width: 100%;
  }
}
</style>
```

**Enregistrer le composant** dans `mobile/src/components/index.ts` :

```typescript
// ... existing exports ...
export { default as DraggableCategory } from './DraggableCategory.vue';
```

---

### 3.5 Modification de la page Observation

**Fichier** : `mobile/src/pages/observation/Index.vue`

**Objectif** : Intégrer le mode édition avec basculement entre grille CSS et positions absolues.

#### 3.5.1 Imports à ajouter

```typescript
import { nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useEditMode } from '@composables';
import { DraggableCategory } from '@components';
```

#### 3.5.2 Dans `setup()`, ajouter

```typescript
// Edit mode composable
const editMode = useEditMode();

// Container ref for bounds calculation
const editContainerRef = ref<HTMLElement | null>(null);

// Container bounds for drag constraints
const containerBounds = computed(() => {
  if (editContainerRef.value) {
    const rect = editContainerRef.value.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  return { width: 350, height: 600 };
});

// Initialize positions when categories change
watch(
  () => state.categories,
  (categories) => {
    if (categories.length > 0) {
      editMode.methods.initializePositions(categories);
    }
  },
  { immediate: true }
);

// Computed: can enter edit mode (not recording)
const canEnterEditMode = computed(() => 
  !state.isRecording && !chronicle.sharedState.isPaused
);

// Watch orientation changes to recalculate bounds
const $q = useQuasar();
watch(() => $q.screen.width, () => {
  if (editMode.sharedState.isEditing && editContainerRef.value) {
    // Recalculer les bounds si l'orientation change
    const rect = editContainerRef.value.getBoundingClientRect();
    containerBounds.value = { width: rect.width, height: rect.height };
  }
});
```

#### 3.5.3 Ajouter les méthodes dans `methods`

```typescript
// Edit mode methods
enterEditMode: () => {
  if (canEnterEditMode.value) {
    editMode.methods.enterEditMode();
  }
},

exitEditMode: async () => {
  try {
    await editMode.methods.exitEditMode();
    
    // Attendre que la DB soit à jour, puis recharger
    await nextTick();
    await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle!.id);
    await nextTick(); // Attendre que currentProtocol soit mis à jour
    
    methods.loadProtocol();
    
    // Réinitialiser les positions depuis les nouvelles données
    editMode.methods.initializePositions(state.categories);
  } catch (error) {
    console.error('Failed to exit edit mode:', error);
    $q.notify({
      type: 'negative',
      message: 'Erreur lors de la sauvegarde des positions',
      position: 'top',
    });
    // Garder le mode édition ouvert pour permettre retry
    // Ne pas appeler exitEditMode() pour ne pas réinitialiser l'état
  }
},

handleDragMove: ({ categoryId, position }: { categoryId: number; position: { x: number; y: number } }) => {
  editMode.methods.updateCategoryPosition(categoryId, position);
},

resetCategoryPositions: () => {
  editMode.methods.resetPositions(state.categories);
},
```

#### 3.5.4 Modifications du template

**Bouton Éditer dans le header** (à côté du bouton Protocole) :

```vue
<!-- Bouton mode édition -->
<q-btn
  v-if="!editMode.sharedState.isEditing && canEnterEditMode"
  flat
  dense
  icon="mdi-pencil"
  color="white"
  size="sm"
  @click="methods.enterEditMode"
>
  <q-tooltip>Éditer les positions</q-tooltip>
</q-btn>

<!-- Boutons en mode édition -->
<template v-if="editMode.sharedState.isEditing">
  <q-btn
    flat
    dense
    icon="mdi-refresh"
    color="white"
    size="sm"
    @click="methods.resetCategoryPositions"
  >
    <q-tooltip>Réinitialiser les positions</q-tooltip>
  </q-btn>
  <q-btn
    flat
    dense
    icon="mdi-check"
    color="positive"
    size="sm"
    :loading="editMode.sharedState.isSaving"
    @click="methods.exitEditMode"
  >
    <q-tooltip>Terminer l'édition</q-tooltip>
  </q-btn>
</template>
```

**Zone des catégories** - remplacer `<div class="categories-container">` :

```vue
<!-- Zone des catégories -->
<div class="categories-container">
  <!-- MODE NORMAL : Grille CSS -->
  <q-scroll-area v-if="!editMode.sharedState.isEditing" class="categories-scroll">
    <div class="q-pa-md">
      <div class="categories-grid">
        <!-- ... existing q-card loop ... -->
      </div>
    </div>
  </q-scroll-area>

  <!-- MODE ÉDITION : Positions absolues -->
  <div 
    v-else 
    ref="editContainerRef"
    class="edit-container"
    :style="{ minHeight: editMode.methods.getMinContainerHeight() + 'px' }"
  >
    <!-- Message d'aide -->
    <div class="edit-hint q-pa-sm text-center text-caption text-grey-6">
      <q-icon name="mdi-gesture-swipe" class="q-mr-xs" />
      Glissez les catégories pour les repositionner
    </div>

    <!-- Catégories draggables -->
    <DraggableCategory
      v-for="category in state.categories"
      :key="category.id"
      :category="category"
      :position="editMode.sharedState.categoryPositions[category.id] || { x: 0, y: 0 }"
      :container-bounds="containerBounds"
      :style="editMode.methods.getCategoryStyle(category.id)"
      @drag-start="editMode.methods.startDrag"
      @drag-move="methods.handleDragMove"
      @drag-end="editMode.methods.endDrag"
    />
  </div>
</div>
```

#### 3.5.5 Styles à ajouter

```scss
.edit-container {
  position: relative;
  flex: 1;
  overflow: auto;
  background: 
    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

.edit-hint {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}
```

#### 3.5.6 Ajouter dans le return

```typescript
return {
  // ... existing ...
  editMode,
  editContainerRef,
  containerBounds,
  canEnterEditMode,
};
```

---

### 3.6 Import jchronic : Préserver `meta`

#### 3.6.1 Modifier les types normalisés

**Fichier** : `packages/core/src/import/types.ts`

```typescript
export interface INormalizedCategory {
  name: string;
  description?: string;
  order?: number;
  meta?: Record<string, unknown>;  // ← AJOUTER
  observables?: INormalizedObservable[];
}
```

#### 3.6.2 Modifier le parser jchronic

**Fichier** : `packages/core/src/import/jchronic-parser.ts`

Dans la fonction `normalizeJchronicData()`, ajouter `meta` à la catégorie :

```typescript
protocolCategories.push({
  name: item.name,
  description: item.description,
  order: item.order,
  meta: item.meta,  // ← AJOUTER cette ligne
  observables: observables.length > 0 ? observables : undefined,
});
```

#### 3.6.3 Modifier le service d'import mobile

**Fichier** : `mobile/src/services/import.service.ts`

Dans `saveNormalizedImport()`, passer `meta` à `addCategory()` :

```typescript
// Add categories and observables
if (data.protocol?.categories) {
  for (let i = 0; i < data.protocol.categories.length; i++) {
    const category = data.protocol.categories[i];
    const categoryItem = await protocolRepository.addCategory(
      protocol.id,
      category.name,
      i,
      'continuous',
      category.meta  // ← AJOUTER ce paramètre
    );
    categoriesCount++;

    // ... rest of code for observables ...
  }
}
```

---

## 4. Tests

### 4.1 Tests manuels

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | Migration SQLite | Installer l'app sur un device avec ancienne version | Colonne `meta` ajoutée sans perte de données |
| 2 | Nouvelle installation | Installer l'app sur device vierge | DB créée avec colonne `meta` |
| 3 | Entrer en mode édition | Cliquer sur bouton "Éditer" | Les catégories deviennent draggables |
| 4 | Drag catégorie | Glisser une catégorie | Position mise à jour en temps réel |
| 5 | Contraintes de drag | Essayer de sortir du conteneur | Catégorie reste dans les limites |
| 6 | Terminer édition | Cliquer sur "Terminer" | Positions sauvegardées en DB |
| 7 | Persistence | Quitter et revenir sur l'observation | Positions restaurées |
| 8 | Reset positions | Cliquer sur "Reset" | Grille par défaut restaurée |
| 9 | Import jchronic avec positions | Importer un fichier avec `meta.position` | Positions importées correctement |
| 10 | Import jchronic sans positions | Importer un fichier sans `meta` | Grille par défaut appliquée |
| 11 | Mode édition bloqué pendant enregistrement | Lancer enregistrement puis essayer d'éditer | Bouton "Éditer" non visible |

### 4.2 Tests unitaires (optionnels)

```typescript
// tests/use-edit-mode.test.ts
describe('useEditMode', () => {
  it('should initialize positions from meta.position', () => {
    const editMode = useEditMode();
    const categories = [
      { id: 1, meta: { position: { x: 50, y: 100 } } },
      { id: 2, meta: null },
    ];
    
    editMode.methods.initializePositions(categories);
    
    expect(editMode.sharedState.categoryPositions[1]).toEqual({ x: 50, y: 100 });
    expect(editMode.sharedState.categoryPositions[2]).toEqual({ x: 16, y: 216 }); // grid default
  });

  it('should constrain position within bounds', () => {
    const editMode = useEditMode();
    const position = { x: -50, y: 1000 };
    const bounds = { width: 400, height: 600 };
    
    const constrained = editMode.methods.constrainPosition(position, bounds);
    
    expect(constrained.x).toBeGreaterThanOrEqual(10);
    expect(constrained.y).toBeLessThanOrEqual(600 - 100 - 10);
  });
});
```

---

## 5. Checklist

### Tâches de développement

- [ ] **3.1** Migration SQLite : ajouter colonne `meta`
  - [ ] Créer `migration_002_add_meta_field()`
  - [ ] Mettre à jour `runMigrations()`
  - [ ] Tester idempotence

- [ ] **3.2** Repository protocol : gérer `meta`
  - [ ] Ajouter `meta` à `IProtocolItemEntity`
  - [ ] Modifier `mapItem()` pour parser JSON
  - [ ] Modifier `addCategory()` pour accepter `meta`
  - [ ] Modifier `updateItem()` pour inclure `meta`
  - [ ] Ajouter `updateCategoryPosition()`

- [ ] **3.3** Composable `useEditMode`
  - [ ] Créer le fichier `use-edit-mode/index.ts`
  - [ ] Implémenter `initializePositions()`
  - [ ] Implémenter `enterEditMode()` / `exitEditMode()`
  - [ ] Implémenter `updateCategoryPosition()`
  - [ ] Implémenter `saveAllPositions()`
  - [ ] Implémenter `resetPositions()`
  - [ ] Implémenter `getCategoryStyle()`
  - [ ] Implémenter drag handlers
  - [ ] Exporter dans `composables/index.ts`

- [ ] **3.4** Composant `DraggableCategory`
  - [ ] Créer le fichier `DraggableCategory.vue`
  - [ ] Implémenter touch events
  - [ ] Implémenter contraintes de position
  - [ ] Ajouter styles visuels
  - [ ] Exporter dans `components/index.ts`

- [ ] **3.5** Page Observation
  - [ ] Ajouter imports
  - [ ] Intégrer `useEditMode` dans setup
  - [ ] Ajouter boutons mode édition
  - [ ] Implémenter basculement grille/absolu
  - [ ] Ajouter styles edit-container
  - [ ] Bloquer édition pendant enregistrement

- [ ] **3.6** Import jchronic
  - [ ] Ajouter `meta` à `INormalizedCategory`
  - [ ] Modifier parser pour préserver `meta`
  - [ ] Modifier service import mobile

### Tests

- [ ] Tester migration sur device existant
- [ ] Tester nouvelle installation
- [ ] Tester cycle complet édition
- [ ] Tester import avec/sans positions
- [ ] Tester sur différents devices (taille écran)

### Documentation

- [ ] Mettre à jour README mobile si nécessaire
- [ ] Documenter le format `meta.position`

---

## Notes d'implémentation

### Ordre recommandé

1. **Migration SQLite** (3.1) - Base de données prête
2. **Repository** (3.2) - Accès aux données
3. **Types core** (3.6 partiel) - `INormalizedCategory.meta`
4. **Composable** (3.3) - Logique métier
5. **Composant draggable** (3.4) - UI drag
6. **Page observation** (3.5) - Intégration
7. **Import jchronic** (3.6 complet) - Persistence externe

### Points d'attention

1. **Touch events** : Utiliser `@touchstart.prevent` pour éviter le scroll pendant le drag
2. **Performance** : Throttle les événements `touchmove` à ~60fps (16ms) pour éviter la surcharge
3. **Accessibilité** : Le mode édition désactive les interactions d'observation
4. **Bounds dynamiques** : Recalculer les bounds si l'orientation change (watch sur `$q.screen.width`)
5. **Gestion d'erreurs** : Ne pas réinitialiser `hasUnsavedChanges` en cas d'erreur pour permettre retry
6. **Rechargement des données** : Utiliser `nextTick()` pour s'assurer que les données sont à jour après sauvegarde
7. **Validation des positions** : Valider les positions importées (type, NaN, valeurs négatives)

---

## 6. Améliorations et points d'attention

### 6.1 Gestion des erreurs de sauvegarde

**Problème** : Si la sauvegarde échoue, l'utilisateur doit pouvoir réessayer sans perdre ses modifications.

**Solution implémentée** :
- Dans `saveAllPositions()`, ne pas réinitialiser `hasUnsavedChanges` en cas d'erreur
- Dans `exitEditMode()` de la page Observation, capturer l'erreur et afficher une notification
- Garder le mode édition ouvert pour permettre retry

**Code** : Voir section 3.3 (`saveAllPositions`) et 3.5.3 (`exitEditMode`)

### 6.2 Rechargement des données après sauvegarde

**Problème** : Après `exitEditMode()`, il faut s'assurer que les données sont rechargées depuis la DB avant de réinitialiser les positions.

**Solution implémentée** :
- Utiliser `nextTick()` pour attendre que la DB soit à jour
- Attendre que `currentProtocol` soit mis à jour avant de réinitialiser les positions
- Réinitialiser les positions depuis les nouvelles données chargées

**Code** : Voir section 3.5.3 (`exitEditMode`)

### 6.3 Performance : Throttle des événements touchmove

**Problème** : Les événements `touchmove` peuvent être très fréquents (100+ par seconde), causant des problèmes de performance.

**Solution implémentée** :
- Throttle à ~60fps (16ms) dans `DraggableCategory.handleTouchMove`
- Utiliser un closure pour maintenir l'état du dernier appel

**Code** : Voir section 3.4 (`handleTouchMove`)

### 6.4 Gestion du changement d'orientation

**Problème** : Si l'utilisateur change l'orientation pendant le mode édition, les bounds du conteneur doivent être recalculées.

**Solution implémentée** :
- Watch sur `$q.screen.width` pour détecter les changements d'orientation
- Recalculer `containerBounds` quand l'orientation change

**Code** : Voir section 3.5.2 (watch orientation)

### 6.5 Validation des positions lors de l'import

**Problème** : Les positions importées depuis `meta.position` peuvent être invalides (NaN, valeurs négatives, mauvais type).

**Solution implémentée** :
- Validation complète dans `initializePositions()` :
  - Vérifier que c'est un objet
  - Vérifier que x et y sont des nombres
  - Vérifier qu'ils ne sont pas NaN
  - Vérifier qu'ils sont >= 0
- Fallback vers grille si validation échoue

**Code** : Voir section 3.3 (`initializePositions`)

### 6.6 Nettoyage des positions obsolètes

**Problème** : Si une catégorie est supprimée pendant l'édition, `categoryPositions` peut contenir des IDs obsolètes.

**Solution implémentée** :
- Dans `initializePositions()`, nettoyer les positions pour les catégories qui n'existent plus
- Utiliser un Set pour une vérification efficace

**Code** : Voir section 3.3 (`initializePositions`)

### 6.7 Export jchronic : Vérifier l'inclusion des positions

**Note** : Le plan couvre l'import mais pas l'export. À vérifier que le service d'export mobile inclut déjà `meta` dans les catégories. Si ce n'est pas le cas, il faudra l'ajouter.

**À vérifier** :
- Le service d'export mobile lit-il `meta` depuis SQLite ?
- Le format d'export inclut-il `meta.position` ?

### 6.8 Feedback haptique (optionnel)

**Amélioration future** : Ajouter un feedback haptique léger au début du drag pour améliorer l'UX.

**Code optionnel** :
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

handleTouchStart: async (event: TouchEvent) => {
  // ... existing code ...
  // Feedback haptique léger
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Ignore if haptics not available
  }
},
```

---

*Dernière mise à jour : Décembre 2025*

