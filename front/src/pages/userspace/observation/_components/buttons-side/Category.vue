<template>
  <q-card
    class="category-container"
    :class="{ 'is-dragging': isDragging }"
  >
    <q-card-section class="category-header">
      <div class="category-title">
        <q-btn
          flat
          dense
          round
          icon="drag_indicator"
          class="drag-handle"
          @mousedown="handleDragStart"
          @touchstart.prevent="handleDragStart"
        />
        <div class="text-subtitle1 q-ml-sm">{{ category.name }}</div>
      </div>
      <div v-if="category.description" class="category-description text-caption q-mt-xs">
        {{ category.description }}
      </div>
    </q-card-section>

    <q-card-section class="category-content">
      <div v-if="isContinuous" class="buttons-container row q-gutter-y-sm">
        <SwitchButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :active="activeObservableId === observable.id"
          :disabled="!isObservationActive"
          @click="handleSwitchClick(observable)"
        />
      </div>
      
      <div v-else class="buttons-container column q-gutter-y-sm">
        <PressButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :disabled="!isObservationActive"
          @click="handlePressClick(observable)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { ProtocolItem, ProtocolItemActionEnum } from '@services/observations/protocol.service';
import SwitchButton from './SwitchButton.vue';
import PressButton from './PressButton.vue';

export default defineComponent({
  name: 'CategoryComponent',

  components: {
    SwitchButton,
    PressButton
  },

  props: {
    category: {
      type: Object as PropType<ProtocolItem>,
      required: true
    },
    activeObservableIdByCategoryId: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({})
    },
    position: {
      type: Object as PropType<{ x: number, y: number }>,
      default: () => ({ x: 0, y: 0 })
    },
    isObservationActive: {
      type: Boolean,
      default: false
    }
  },

  emits: ['switchClick', 'pressClick', 'move', 'dragStart', 'dragEnd'],

  setup(props, { emit }) {
    const isDragging = ref(false);
    const dragStartPos = ref({ x: 0, y: 0 });
    const dragOffset = ref({ x: 0, y: 0 });
    const initialPosition = ref({ x: 0, y: 0 });

    const isContinuous = computed(() => {
      return props.category.action === ProtocolItemActionEnum.Continuous;
    });

    const activeObservableId = computed(() => {
      return props.activeObservableIdByCategoryId[props.category.id] || null;
    });

    const handleSwitchClick = (observable: ProtocolItem) => {
      emit('switchClick', {
        categoryId: props.category.id,
        observableId: observable.id
      });
    };

    const handlePressClick = (observable: ProtocolItem) => {
      emit('pressClick', {
        categoryId: props.category.id,
        observableId: observable.id
      });
    };

    const handleDragStart = (event: MouseEvent | TouchEvent) => {
      isDragging.value = true;
      
      // Notify parent component about drag start
      emit('dragStart', props.category.id);
      
      // Store initial position at drag start
      initialPosition.value = { ...props.position };
      
      // Get the starting position for drag
      if ('touches' in event) {
        // Touch event
        dragStartPos.value = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else {
        // Mouse event
        dragStartPos.value = {
          x: event.clientX,
          y: event.clientY
        };
      }

      dragOffset.value = { x: 0, y: 0 };

      // Add event listeners for drag movement and end
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
    };

    const handleDragMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging.value) return;
      
      // Prevent default to avoid scrolling
      if (event.cancelable) {
        event.preventDefault();
      }

      let currentX, currentY;
      
      if ('touches' in event) {
        // Touch event
        currentX = event.touches[0].clientX;
        currentY = event.touches[0].clientY;
      } else {
        // Mouse event
        currentX = event.clientX;
        currentY = event.clientY;
      }

      // Calculate offset from starting position
      dragOffset.value = {
        x: currentX - dragStartPos.value.x,
        y: currentY - dragStartPos.value.y
      };

      // Get parent container dimensions - add a simple constraint check
      const container = document.querySelector('.categories-wrapper');
      const containerRect = container?.getBoundingClientRect();
      let newX = initialPosition.value.x + dragOffset.value.x;
      let newY = initialPosition.value.y + dragOffset.value.y;
      
      // Basic boundary constraints
      if (containerRect) {
        // Make sure we don't move out of bounds too far
        // Leave a margin of 20px on each side
        const margin = 20;
        const cardWidth = 300; // From getCategoryStyle width
        
        // Ensure at least part of the category remains visible
        if (newX < -cardWidth + margin) newX = -cardWidth + margin;
        if (newX > containerRect.width - margin) newX = containerRect.width - margin;
        if (newY < 0) newY = 0;
        if (newY > containerRect.height - 100) newY = containerRect.height - 100;
      }

      // Emit move event with new position - using the constrained values
      emit('move', {
        categoryId: props.category.id,
        position: {
          x: newX,
          y: newY
        }
      });
    };

    const handleDragEnd = () => {
      isDragging.value = false;
      
      // Notify parent component about drag end
      emit('dragEnd', props.category.id);
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };

    return {
      isContinuous,
      activeObservableId,
      isDragging,
      handleSwitchClick,
      handlePressClick,
      handleDragStart
    };
  }
});
</script>

<style scoped>
.category-container {
  width: 100%;
  border-radius: 8px;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
  position: relative;
  background-color: #f9f9f9;
  margin-bottom: 16px;
}

.category-container:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.category-container.is-dragging {
  opacity: 0.8;
  transform: scale(1.02);
  cursor: grabbing;
  z-index: 100;
}

.category-header {
  padding-bottom: 8px;
  border-bottom: 1px solid #eaeaea;
}

.category-title {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.category-description {
  color: #666;
}

.category-content {
  padding-top: 12px;
}

.drag-handle {
  cursor: grab;
}

.buttons-container {
  display: flex;
  flex-direction: column;
}
</style> 