<template>
  <q-card
    class="draggable-category"
    :class="{
      'is-dragging': state.isDragging,
      'is-resizing': state.isResizing,
      'is-draggable': draggable,
      'continuous': category.action === 'continuous',
    }"
    :data-category-id="category.id"
    @touchstart="methods.handleTouchStart"
    @touchmove="methods.handleTouchMove"
    @touchend="methods.handleTouchEnd"
    @touchcancel="methods.handleTouchEnd"
  >
    <q-card-section class="category-header q-py-sm q-px-sm">
      <div class="row items-center no-wrap">
        <q-icon
          v-if="draggable"
          name="mdi-drag"
          class="drag-handle q-mr-xs"
          size="24px"
          color="white"
        />
        <div class="category-name text-subtitle2 text-weight-bold ellipsis">
          {{ category.name }}
        </div>
      </div>
    </q-card-section>

    <q-card-section class="category-content q-py-sm q-px-sm">
      <div v-if="!category.children || category.children.length === 0" class="text-center text-caption text-faint">
        Vide
      </div>

      <!-- Continuous category: Switch buttons (toggle) -->
      <div v-else-if="category.action === 'continuous'" class="observables-list">
        <q-btn
          v-for="observable in category.children"
          :key="observable.id"
          :label="observable.name"
          :class="{ 'is-active': activeObservableByCategory[category.id] === observable.name }"
          :disable="continuousObservablesDisabled"
          rounded
          unelevated
          no-caps
          class="observable-btn-small observable-btn-rest"
          @click="onToggleObservable ? onToggleObservable(category, observable) : undefined"
        />
      </div>

      <!-- Discrete category: Press buttons (event) -->
      <div v-else class="observables-list">
        <q-btn
          v-for="observable in category.children"
          :key="observable.id"
          :class="{ 'is-pressed': state.pressedId === observable.id }"
          :disable="discreteObservablesDisabled"
          rounded
          unelevated
          no-caps
          class="observable-btn-small observable-btn-rest"
          @click="methods.handlePress(observable)"
        >
          <q-icon name="mdi-target" class="press-target" left />
          <span class="press-label">{{ observable.name }}</span>
        </q-btn>
      </div>
    </q-card-section>

    <!-- Poignée de redimensionnement (coin bas-droit), mode édition uniquement -->
    <div
      v-if="draggable && resizable"
      class="resize-handle"
      aria-label="Redimensionner la catégorie"
      @touchstart.stop.prevent="methods.handleResizeStart"
      @touchmove.stop.prevent="methods.handleResizeMove"
      @touchend.stop.prevent="methods.handleResizeEnd"
      @touchcancel.stop.prevent="methods.handleResizeEnd"
    >
      <q-icon name="mdi-resize-bottom-right" size="18px" color="white" />
    </div>
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

interface ResizeState {
  isResizing: boolean;
  startTouchX: number;
  startWidth: number;
}

interface PressState {
  // ID de l'observable ponctuel actuellement "pressé" (flash orange ~200ms).
  pressedId: number | null;
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
     * Current width of the category (px). Controlled by the parent via
     * getCategoryWidth(). The card height is content-driven (reflow).
     */
    width: {
      type: Number,
      default: GRID_CONFIG.cardWidth,
    },
    /**
     * Whether the category can be resized via the corner handle.
     * Only meaningful in edit mode (draggable true).
     */
    resizable: {
      type: Boolean,
      default: true,
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
    continuousObservablesDisabled: {
      type: Boolean,
      default: true,
    },
    /**
     * Whether discrete observables are disabled.
     */
    discreteObservablesDisabled: {
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

    /**
     * Emitted when a resize gesture starts
     * @param categoryId - ID of the category
     */
    resizeStart: (categoryId: number) => typeof categoryId === 'number',

    /**
     * Emitted during resize with the new width
     * @param _payload - { categoryId, width }
     */
    resizeMove: (_payload: { categoryId: number; width: number }) => true,

    /**
     * Emitted when a resize gesture ends
     * @param categoryId - ID of the category
     */
    resizeEnd: (categoryId: number) => typeof categoryId === 'number',
  },

  setup(props, { emit }) {
    // ========================================================================
    // State
    // ========================================================================

    const state = reactive<DragState & ResizeState & PressState>({
      isDragging: false,
      startTouch: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 },
      isResizing: false,
      startTouchX: 0,
      startWidth: 0,
      pressedId: null,
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
        event.preventDefault();

        const touch = event.touches[0];
        if (!touch) return;

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
          if (!state.isDragging || !props.draggable) return;
          event.preventDefault();

          const now = Date.now();
          if (now - lastCall < throttleMs) return;
          lastCall = now;

          const touch = event.touches[0];
          if (!touch) return;

          // Calculate delta from start position
          const deltaX = touch.clientX - state.startTouch.x;
          const deltaY = touch.clientY - state.startTouch.y;

          // Calculate new position
          let newX = state.initialPosition.x + deltaX;
          let newY = state.initialPosition.y + deltaY;

          // Constrain to container bounds using the category's actual width
          const { minMargin } = GRID_CONFIG;
          const cardWidth = props.width;

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

      /**
       * Handle press on a discrete observable : flash orange (~200ms) comme sur
       * desktop (PressButton), pour indiquer visuellement le "push". Déclenche
       * ensuite le handler onPressObservable fourni par le parent.
       */
      handlePress: (observable: IProtocolItemWithChildren) => {
        if (props.discreteObservablesDisabled) return;
        state.pressedId = observable.id as unknown as number;
        if (props.onPressObservable) props.onPressObservable(observable);
        setTimeout(() => {
          if (state.pressedId === (observable.id as unknown as number)) {
            state.pressedId = null;
          }
        }, 200);
      },

      // ----------------------------------------------------------------------
      // Resize handlers
      // ----------------------------------------------------------------------

      /**
       * Handle touch start on resize handle - begin resize
       */
      handleResizeStart: (event: TouchEvent) => {
        if (!props.draggable || !props.resizable) return;

        const touch = event.touches[0];
        if (!touch) return;

        state.isResizing = true;
        state.startTouchX = touch.clientX;
        state.startWidth = props.width;

        emit('resizeStart', props.category.id);
      },

      /**
       * Handle touch move on resize handle - update width.
       *
       * ⚠️ Throttle ~60fps pour limiter la fréquence des touchmove.
       */
      handleResizeMove: (() => {
        let lastCall = 0;
        const throttleMs = 16;

        return (event: TouchEvent) => {
          if (!state.isResizing) return;

          const now = Date.now();
          if (now - lastCall < throttleMs) return;
          lastCall = now;

          const touch = event.touches[0];
          if (!touch) return;

          const deltaX = touch.clientX - state.startTouchX;
          const newWidth = state.startWidth + deltaX;

          // Bornes: largeur min/max de GRID_CONFIG, plafonnée à la largeur
          // du conteneur moins les marges.
          const { minCardWidth, maxCardWidth, minMargin } = GRID_CONFIG;
          const effectiveMax = Math.max(
            minCardWidth,
            Math.min(maxCardWidth, props.containerBounds.width - minMargin * 2)
          );
          const clamped = Math.max(minCardWidth, Math.min(newWidth, effectiveMax));

          emit('resizeMove', {
            categoryId: props.category.id,
            width: Math.round(clamped),
          });
        };
      })(),

      /**
       * Handle touch end on resize handle - finish resize
       */
      handleResizeEnd: () => {
        if (!state.isResizing) return;

        state.isResizing = false;
        emit('resizeEnd', props.category.id);
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
// --ui-scale est posée par le conteneur d'observation (.positioned-container)
// et cascade vers ce composant. Elle ajuste globalement la taille de l'UI.
.draggable-category {
  touch-action: auto;
  user-select: auto;
  border-radius: 12px;
  overflow: hidden;
  background: white;

  &.is-draggable {
    touch-action: none;
    user-select: none;
  }

  // Visual feedback for drag state
  &.is-dragging {
    opacity: 0.95;

    .drag-handle {
      color: var(--accent) !important;
    }
  }

  // Visual feedback for resize state
  &.is-resizing {
    .resize-handle {
      color: var(--accent) !important;
      transform: scale(1.15);
    }
  }

  &.continuous {
    .category-header {
      background: rgba(249, 115, 22, 0.12);
      color: #9a3412;
      border-bottom-color: rgba(249, 115, 22, 0.18);

      .drag-handle {
        color: #9a3412 !important;
      }
    }
  }

  .category-header {
    background: var(--primary);
    color: white;
    border-bottom: 1px solid rgba(31, 41, 55, 0.12);
    min-height: calc(44px * var(--ui-scale, 1));
  }

  .category-name {
    flex: 1;
    min-width: 0; // Enable text truncation
    font-size: calc(14px * var(--ui-scale, 1));
  }

  .drag-handle {
    cursor: grab;
    opacity: 1;

    &:active {
      cursor: grabbing;
    }
  }

  .category-content {
    min-height: calc(56px * var(--ui-scale, 1));
    background: white;
  }

  .observables-list {
    // Grille fluide : les boutons gardent une largeur fixe (liée à --ui-scale,
    // pas à la largeur de la carte) et se repositionnent dynamiquement quand
    // la catégorie est redimensionnée. Aucun stretch avec la carte.
    display: flex;
    flex-wrap: wrap;
    gap: calc(8px * var(--ui-scale, 1));
  }

  // Touch target follows Material 48dp guidance, scaled by --ui-scale.
  // Largeur fixe (basis) pilotée par --ui-scale uniquement : la carte ne
  // modifie pas la taille du bouton, seulement le nombre de boutons par rangée.
  .observable-btn-small {
    flex: 0 0 auto;
    width: calc(120px * var(--ui-scale, 1));
    // Garde-fou : si la carte est plus étroite qu'un bouton (largeur min),
    // on plafonne pour éviter tout débordement.
    max-width: 100%;
    justify-content: center;
    text-align: center;
    // Autorise le retour à la ligne pour les noms longs plutôt que l'overflow.
    white-space: normal;
    word-break: break-word;
    font-size: calc(14px * var(--ui-scale, 1));
    padding: calc(10px * var(--ui-scale, 1)) calc(12px * var(--ui-scale, 1));
    min-height: calc(48px * var(--ui-scale, 1));
  }

  // Aspect des boutons d'observable aligné sur le desktop (front/) :
  // - repos : fond --button-rest-bg (gris clair #e8e8ec / sombre #445a78),
  //   texte --text (noir/blanc selon thème)
  // - actif (continu) / pressé (ponctuel) : fond --accent-strong (#c2410c),
  //   texte blanc, flash ~200ms pour le ponctuel
  // - ponctuel : icône cible mdi-target à gauche (cf. desktop PressButton)
  .observable-btn-rest {
    background-color: var(--button-rest-bg) !important;
    color: var(--text) !important;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

    &.is-active {
      background-color: var(--accent-strong) !important;
      color: white !important;
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
      font-weight: 600;
    }

    &.is-pressed {
      background-color: var(--accent-strong) !important;
      color: white !important;
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);

      .press-target {
        opacity: 1;
        transform: scale(1.15);
      }
    }
  }

  .press-target {
    margin-right: calc(6px * var(--ui-scale, 1));
    font-size: calc(16px * var(--ui-scale, 1));
    opacity: 0.7;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .press-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  // Poignée de redimensionnement (coin bas-droit).
  // Zone tactile agrandie via la hit-area interne transparente.
  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 2px;
    color: rgba(255, 255, 255, 0.85);
    cursor: nwse-resize;
    touch-action: none;
    transition: transform 0.15s ease;

    // Hit-area translucide agrandie pour le tactile, sans impact visuel.
    // Bornée à l'intérieur de la carte (overflow: hidden) pour ne pas être clippée.
    &::before {
      content: '';
      position: absolute;
      right: 0;
      bottom: 0;
      width: 36px;
      height: 36px;
    }

    .q-icon {
      position: relative;
      // L'icône reste lisible sur fond clair (bas de carte = contenu blanc).
      color: var(--primary);
      opacity: 0.55;
    }
  }

  // En mode édition, on rend la poignée plus visible.
  &.is-draggable .resize-handle .q-icon {
    opacity: 0.9;
  }
}
</style>
