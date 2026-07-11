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
import { useUiScale } from '@composables/use-ui-scale';

// ============================================================================
// Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

/**
 * Taille d'une catégorie.
 * Seule la largeur est pilotée par l'utilisateur ; la hauteur découle
 * du contenu (reflow) et est mesurée après rendu.
 */
export interface Size {
  width: number;
}

interface EditModeState {
  /** Whether edit mode is currently active */
  isEditing: boolean;
  /** Position of each category by ID */
  categoryPositions: Record<number, Position>;
  /** Custom width per category (absolute px). Absent = largeur par défaut. */
  categorySizes: Record<number, Size>;
  /** Hauteur rendue mesurée par catégorie (px), pour le dimensionnement du conteneur. */
  categoryHeights: Record<number, number>;
  /** Whether a category is currently being dragged */
  isDragging: boolean;
  /** ID of the category being dragged (null if none) */
  draggingCategoryId: number | null;
  /** Whether a category is currently being resized */
  isResizing: boolean;
  /** ID of the category being resized (null if none) */
  resizingCategoryId: number | null;
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
  /** Bornes de largeur pour le redimensionnement individuel (px) */
  minCardWidth: 100,
  maxCardWidth: 360,
};

// ============================================================================
// Shared State (Singleton)
// ============================================================================

/**
 * Shared state across all useEditMode instances.
 * 
 * ⚠️ IMPORTANT: This is a SINGLETON - all components using useEditMode()
 * share the same state. This is intentional for:
 * - Consistent edit mode across the app
 * - Position state preserved between component re-renders
 * 
 * However, this means:
 * - Only ONE observation can be in edit mode at a time
 * - State must be cleaned up when leaving the observation page (see onBeforeUnmount)
 * - Position data persists until explicitly cleared or page unmounts
 */
const sharedState = reactive<EditModeState>({
  isEditing: false,
  categoryPositions: {},
  categorySizes: {},
  categoryHeights: {},
  isDragging: false,
  draggingCategoryId: null,
  isResizing: false,
  resizingCategoryId: null,
  hasUnsavedChanges: false,
  isSaving: false,
});

// ============================================================================
// Composable
// ============================================================================

export function useEditMode() {
  // --------------------------------------------------------------------------
  // External singletons
  // --------------------------------------------------------------------------

  const uiScale = useUiScale();

  // --------------------------------------------------------------------------
  // Computed
  // --------------------------------------------------------------------------

  /** Whether edit mode can be entered (not recording, etc.) */
  const canEnterEditMode = computed(() => !sharedState.isEditing);

  /** Whether there are unsaved changes that need saving */
  const needsSave = computed(() => sharedState.hasUnsavedChanges && !sharedState.isSaving);

  /**
   * Largeur effective d'une catégorie (px).
   *
   * - Si une largeur personnalisée est stockée (meta.size.width), on l'utilise.
   * - Sinon, la largeur par défaut est `cardWidth * uiScale`.
   *
   * La hauteur n'est pas stockée : elle découle du contenu (reflow) et est
   * mesurée après rendu pour dimensionner le conteneur scrollable.
   */
  const getCategoryWidth = (categoryId: number): number => {
    const stored = sharedState.categorySizes[categoryId];
    if (stored && typeof stored.width === 'number' && !isNaN(stored.width)) {
      return stored.width;
    }
    return Math.round(GRID_CONFIG.cardWidth * uiScale.state.scale);
  };

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
      // Clean up positions/sizes for categories that no longer exist
      const categoryIds = new Set(categories.map(c => c.id));
      Object.keys(sharedState.categoryPositions).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categoryPositions[id];
        }
      });
      Object.keys(sharedState.categorySizes).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categorySizes[id];
        }
      });
      Object.keys(sharedState.categoryHeights).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categoryHeights[id];
        }
      });

      // Helper to validate stored position
      const isValidPosition = (pos: unknown): pos is Position => {
        return (
          pos !== null &&
          typeof pos === 'object' &&
          'x' in pos &&
          'y' in pos &&
          typeof (pos as Position).x === 'number' &&
          typeof (pos as Position).y === 'number' &&
          !isNaN((pos as Position).x) &&
          !isNaN((pos as Position).y) &&
          (pos as Position).x >= 0 &&
          (pos as Position).y >= 0
        );
      };

      // Helper to validate stored size
      const isValidSize = (size: unknown): size is Size => {
        return (
          size !== null &&
          typeof size === 'object' &&
          'width' in size &&
          typeof (size as Size).width === 'number' &&
          !isNaN((size as Size).width) &&
          (size as Size).width > 0
        );
      };

      // First pass: load stored positions and sizes
      categories.forEach((category) => {
        const storedPosition = category.meta?.position;

        if (isValidPosition(storedPosition)) {
          sharedState.categoryPositions[category.id] = {
            x: storedPosition.x,
            y: storedPosition.y,
          };
        }

        const storedSize = category.meta?.size;
        if (isValidSize(storedSize)) {
          sharedState.categorySizes[category.id] = { width: storedSize.width };
        }
      });

      // Second pass: assign grid positions to categories without stored positions
      // This ensures no "holes" in the default grid layout
      let row = 0;
      let column = 0;

      categories.forEach((category) => {
        // Skip if already has a position from first pass
        if (sharedState.categoryPositions[category.id]) {
          return;
        }

        // Assign default grid position
        sharedState.categoryPositions[category.id] = {
          x: column * GRID_CONFIG.columnWidth + GRID_CONFIG.padding,
          y: row * GRID_CONFIG.rowHeight + GRID_CONFIG.padding,
        };

        // Move to next grid cell only for categories without stored positions
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
     * 
     * @param validCategoryIds - Optional set of valid category IDs.
     *                          If provided, only positions for these IDs will be saved.
     */
    exitEditMode: async (validCategoryIds?: Set<number>) => {
      // Save positions if there are unsaved changes
      if (sharedState.hasUnsavedChanges) {
        await methods.saveAllPositions(validCategoryIds);
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
     * Update the width of a category during resize.
     *
     * La hauteur n'est pas stockée : elle s'ajuste automatiquement via le
     * reflow du contenu et est mesurée séparément (measureHeights).
     *
     * @param categoryId - ID de la catégorie
     * @param size - Nouvelle taille { width: number }
     */
    updateCategorySize: (categoryId: number, size: Size) => {
      sharedState.categorySizes[categoryId] = size;
      sharedState.hasUnsavedChanges = true;
    },

    /**
     * Save all category positions to SQLite.
     * 
     * This persists the current positions in the meta.position field
     * of each category in the database.
     * 
     * ⚠️ IMPORTANT: Does NOT reset hasUnsavedChanges on error to allow retry.
     * 
     * @param validCategoryIds - Optional set of valid category IDs to filter positions.
     *                           If provided, only positions for these IDs will be saved.
     *                           This prevents saving positions for deleted categories.
     */
    saveAllPositions: async (validCategoryIds?: Set<number>) => {
      if (sharedState.isSaving) return;

      sharedState.isSaving = true;

      try {
        // Filter positions if validCategoryIds is provided
        const positionEntries = validCategoryIds
          ? Object.entries(sharedState.categoryPositions).filter(([categoryIdStr]) => {
              const categoryId = Number(categoryIdStr);
              return validCategoryIds.has(categoryId);
            })
          : Object.entries(sharedState.categoryPositions);

        const sizeEntries = Object.entries(sharedState.categorySizes).filter(([categoryIdStr]) => {
          if (validCategoryIds) {
            return validCategoryIds.has(Number(categoryIdStr));
          }
          return true;
        });

        const promises: Promise<unknown>[] = positionEntries.map(
          async ([categoryIdStr, position]) => {
            const categoryId = Number(categoryIdStr);
            await protocolRepository.updateCategoryPosition(categoryId, position);
          }
        );

        sizeEntries.forEach(([categoryIdStr, size]) => {
          const categoryId = Number(categoryIdStr);
          promises.push(protocolRepository.updateCategorySize(categoryId, size));
        });

        await Promise.all(promises);
        sharedState.hasUnsavedChanges = false;
        console.log(
          `Saved ${positionEntries.length} position(s) and ${sizeEntries.length} size(s) successfully`
        );
      } catch (error) {
        console.error('Failed to save category layout:', error);
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
     * Also cleans up positions for categories that no longer exist.
     * 
     * @param categories - List of categories to reset
     */
    resetPositions: (categories: IProtocolItemWithChildren[]) => {
      // Clean up positions/sizes for categories that no longer exist
      const categoryIds = new Set(categories.map(c => c.id));
      Object.keys(sharedState.categoryPositions).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categoryPositions[id];
        }
      });
      // Reset all custom sizes: return to default width (cardWidth * uiScale)
      Object.keys(sharedState.categorySizes).forEach(idStr => {
        const id = Number(idStr);
        if (!categoryIds.has(id)) {
          delete sharedState.categorySizes[id];
        }
      });
      // Clear custom sizes for remaining categories too
      categories.forEach((category) => {
        delete sharedState.categorySizes[category.id];
      });

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
      const isResizingThis = sharedState.resizingCategoryId === categoryId;

      return {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${getCategoryWidth(categoryId)}px`,
        // Disable transition during drag/resize for smooth, lag-free movement
        transition: (sharedState.isDragging || sharedState.isResizing) ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        // Bring active item to front
        zIndex: (isDraggingThis || isResizingThis) ? 100 : 1,
        // Subtle visual feedback for the active item
        transform: isDraggingThis ? 'scale(1.02)' : 'scale(1)',
        boxShadow: (isDraggingThis || isResizingThis)
          ? '0 8px 24px rgba(0, 0, 0, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
      };
    },

    /**
     * Calculate the minimum container height needed to fit all categories.
     *
     * Utilise les hauteurs réellement rendues (mesurées via measureHeights)
     * plutôt qu'une constante fixe, de façon à supporter le redimensionnement
     * individuel et l'échelle globale. Retourne une hauteur minimale même en
     * l'absence de positions (état vide).
     *
     * @returns Minimum height in pixels
     */
    getMinContainerHeight: (): number => {
      let maxBottom = 0;

      Object.entries(sharedState.categoryPositions).forEach(([idStr, position]) => {
        const id = Number(idStr);
        const measured = sharedState.categoryHeights[id];
        // Fallback: estimate from scale when no measurement is available yet.
        const estimatedHeight = Math.max(
          GRID_CONFIG.cardHeight,
          Math.round(GRID_CONFIG.cardHeight * uiScale.state.scale)
        );
        const height = measured ?? estimatedHeight;
        const bottom = position.y + height;
        if (bottom > maxBottom) {
          maxBottom = bottom;
        }
      });

      // If no positions exist, return minimum height for empty state
      if (maxBottom === 0) {
        return GRID_CONFIG.rowHeight + GRID_CONFIG.padding * 2;
      }

      // Add padding at bottom
      return maxBottom + GRID_CONFIG.padding * 2;
    },

    /**
     * Mesure les hauteurs réelles des cartes rendues et les stocke dans l'état.
     *
     * Doit être appelé après tout changement affectant la hauteur des cartes
     * (resize, chargement, changement d'échelle, rotation) via nextTick, en
     * passant l'élément conteneur (`.positioned-container`).
     *
     * Les cartes sont identifiées par l'attribut `data-category-id` posé par
     * DraggableCategory.
     */
    measureHeights: (containerEl: HTMLElement | null) => {
      if (!containerEl) return;
      const els = containerEl.querySelectorAll<HTMLElement>('[data-category-id]');
      els.forEach((el) => {
        const id = Number(el.getAttribute('data-category-id'));
        if (!isNaN(id)) {
          sharedState.categoryHeights[id] = el.offsetHeight;
        }
      });
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

    // ------------------------------------------------------------------------
    // Resize Handlers
    // ------------------------------------------------------------------------

    /**
     * Called when a category resize gesture starts.
     */
    startResize: (categoryId: number) => {
      sharedState.isResizing = true;
      sharedState.resizingCategoryId = categoryId;
    },

    /**
     * Called when a category resize gesture ends.
     */
    endResize: () => {
      sharedState.isResizing = false;
      sharedState.resizingCategoryId = null;
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

    /**
     * Bornes de largeur pour le redimensionnement d'une catégorie.
     *
     * Tient compte de la largeur du conteneur pour ne pas autoriser une carte
     * plus large que l'espace disponible.
     */
    getCategoryWidthBounds: (containerWidth: number): { min: number; max: number } => {
      const { minCardWidth, maxCardWidth, minMargin } = GRID_CONFIG;
      const effectiveMax = Math.max(
        minCardWidth,
        Math.min(maxCardWidth, containerWidth - minMargin * 2)
      );
      return { min: minCardWidth, max: effectiveMax };
    },

    /**
     * Add a position for a newly created category.
     * 
     * Places the new category at the next available grid position based on
     * the total number of other categories (index-based, not position-based).
     * 
     * This ensures predictable placement regardless of how other categories
     * have been repositioned.
     * 
     * @param categoryId - ID of the new category
     * @param allCategories - List of all categories (including the new one)
     */
    addCategoryPosition: (categoryId: number, allCategories: IProtocolItemWithChildren[]) => {
      // Count existing categories (excluding the new one)
      const existingCount = allCategories.filter(cat => cat.id !== categoryId).length;
      
      // Calculate grid position based on index
      // New category goes at position N (0-indexed) where N = existingCount
      const gridIndex = existingCount;
      const row = Math.floor(gridIndex / GRID_CONFIG.maxColumns);
      const column = gridIndex % GRID_CONFIG.maxColumns;

      sharedState.categoryPositions[categoryId] = {
        x: column * GRID_CONFIG.columnWidth + GRID_CONFIG.padding,
        y: row * GRID_CONFIG.rowHeight + GRID_CONFIG.padding,
      };

      // Mark as unsaved if in edit mode
      if (sharedState.isEditing) {
        sharedState.hasUnsavedChanges = true;
      }
    },

    /**
     * Remove the position for a deleted category.
     * 
     * This cleans up the position immediately when a category is deleted
     * during edit mode.
     * 
     * @param categoryId - ID of the deleted category
     */
    removeCategoryPosition: (categoryId: number) => {
      if (sharedState.categoryPositions[categoryId]) {
        delete sharedState.categoryPositions[categoryId];
        // Note: We don't mark as unsaved because the position is already
        // being removed from the database via deleteItem
      }
      if (sharedState.categorySizes[categoryId]) {
        delete sharedState.categorySizes[categoryId];
      }
      if (sharedState.categoryHeights[categoryId]) {
        delete sharedState.categoryHeights[categoryId];
      }
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
    uiScale,
    getCategoryWidth,
    methods,
  };
}
