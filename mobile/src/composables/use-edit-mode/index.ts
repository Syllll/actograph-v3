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

      // First pass: load stored positions
      categories.forEach((category) => {
        const storedPosition = category.meta?.position;
        
        if (isValidPosition(storedPosition)) {
          sharedState.categoryPositions[category.id] = {
            x: storedPosition.x,
            y: storedPosition.y,
          };
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
        const positionsToSave = validCategoryIds
          ? Object.entries(sharedState.categoryPositions).filter(([categoryIdStr]) => {
              const categoryId = Number(categoryIdStr);
              return validCategoryIds.has(categoryId);
            })
          : Object.entries(sharedState.categoryPositions);

        const promises = positionsToSave.map(
          async ([categoryIdStr, position]) => {
            const categoryId = Number(categoryIdStr);
            await protocolRepository.updateCategoryPosition(categoryId, position);
          }
        );

        await Promise.all(promises);
        sharedState.hasUnsavedChanges = false;
        console.log(`Saved ${promises.length} category position(s) successfully`);
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
     * Also cleans up positions for categories that no longer exist.
     * 
     * @param categories - List of categories to reset
     */
    resetPositions: (categories: IProtocolItemWithChildren[]) => {
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
     * Returns a minimum height even if no positions exist (for empty state).
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

      // If no positions exist, return minimum height for empty state
      if (maxBottom === 0) {
        return GRID_CONFIG.rowHeight + GRID_CONFIG.padding * 2;
      }

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
