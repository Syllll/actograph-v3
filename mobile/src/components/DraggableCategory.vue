<template>
  <q-card
    class="draggable-category"
    :class="{
      'is-dragging': state.isDragging,
      'continuous': category.action === 'continuous',
    }"
    @touchstart.prevent="methods.handleTouchStart"
    @touchmove.prevent="methods.handleTouchMove"
    @touchend="methods.handleTouchEnd"
    @touchcancel="methods.handleTouchEnd"
  >
    <!-- Header avec icône de drag (seulement en mode édition) -->
    <q-card-section class="category-header q-py-xs q-px-sm">
      <div class="row items-center no-wrap">
        <q-icon 
          v-if="draggable"
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

    <!-- Contenu : liste des observables (identique au mode normal) -->
    <q-card-section class="category-content q-py-sm q-px-sm">
      <!-- Empty category message -->
      <div v-if="!category.children || category.children.length === 0" class="text-center">
        <div class="text-caption text-grey">Vide</div>
      </div>

      <!-- Continuous category: Switch buttons (toggle) -->
      <div v-else-if="category.action === 'continuous'" class="observables-list">
        <q-btn
          v-for="observable in category.children"
          :key="observable.id"
          :label="observable.name"
          :color="activeObservableByCategory[category.id] === observable.name ? 'accent' : 'grey-4'"
          :text-color="activeObservableByCategory[category.id] === observable.name ? 'white' : 'dark'"
          :outline="activeObservableByCategory[category.id] !== observable.name"
          :disable="observablesDisabled"
          dense
          rounded
          unelevated
          no-caps
          size="sm"
          class="observable-btn-small"
          @click="onToggleObservable ? onToggleObservable(category, observable) : undefined"
        />
      </div>

      <!-- Discrete category: Press buttons (event) -->
      <div v-else class="observables-list">
        <q-btn
          v-for="observable in category.children"
          :key="observable.id"
          :label="observable.name"
          color="primary"
          :disable="observablesDisabled"
          dense
          rounded
          unelevated
          no-caps
          size="sm"
          class="observable-btn-small"
          @click="onPressObservable ? onPressObservable(observable) : undefined"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, reactive, type PropType } from 'vue';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import { GRID_CONFIG } from '@composables/use-edit-mode';

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
    /**
     * Active observable by category ID (for continuous categories)
     */
    activeObservableByCategory: {
      type: Object as PropType<Record<number, string>>,
      default: () => ({}),
    },
    /**
     * Whether the category is draggable (true in edit mode, false in normal mode)
     */
    draggable: {
      type: Boolean,
      default: true,
    },
    /**
     * Whether observables are disabled (true in edit mode, false in normal mode)
     */
    observablesDisabled: {
      type: Boolean,
      default: true,
    },
    /**
     * Handler for observable toggle (continuous categories)
     */
    onToggleObservable: {
      type: Function as PropType<(category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => void>,
      default: undefined,
    },
    /**
     * Handler for observable press (discrete categories)
     */
    onPressObservable: {
      type: Function as PropType<(observable: IProtocolItemWithChildren) => void>,
      default: undefined,
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
     * @param _payload - { categoryId, position }
     */
    dragMove: (_payload: { categoryId: number; position: Position }) => true,
    
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
    // Methods
    // ========================================================================

    const methods = {
      /**
       * Handle touch start - begin drag
       */
      handleTouchStart: (event: TouchEvent) => {
        if (!props.draggable) return;
        
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

          // Constrain to container bounds using GRID_CONFIG constants
          const { cardWidth, minMargin } = GRID_CONFIG;

          // X: constrain within container width
          newX = Math.max(
            minMargin, 
            Math.min(newX, props.containerBounds.width - cardWidth - minMargin)
          );
          
          // Y: only constrain minimum (top), allow expanding downward
          // The container will grow dynamically via getMinContainerHeight()
          newY = Math.max(minMargin, newY);

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
      color: var(--accent) !important;
    }
  }

  &.continuous {
    .category-header {
      background: var(--accent);
    }
  }

  .category-header {
    background: var(--primary);
    color: white;
    min-height: 28px;
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
    min-height: 50px;
  }

  .observables-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .observable-btn-small {
    width: 100%;
    justify-content: flex-start;
    font-size: 11px;
    padding: 2px 8px;
    min-height: 24px;
  }
}
</style>
