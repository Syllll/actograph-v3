<template>
  <q-card
    class="category-container"
    :class="{ 'is-dragging': state.isDragging }"
  >
    <q-card-section class="category-header">
      <div class="category-title">
        <q-btn
          flat
          dense
          round
          icon="drag_indicator"
          class="drag-handle"
          @mousedown="methods.handleDragStart"
          @touchstart.prevent="methods.handleDragStart"
        />
        <div class="text-subtitle1 q-ml-sm">{{ category.name }}</div>
      </div>
      <div v-if="category.description" class="category-description text-caption q-mt-xs">
        {{ category.description }}
      </div>
    </q-card-section>

    <q-card-section class="category-content">
      <div v-if="computedState.isContinuous.value" class="buttons-container row q-gutter-y-sm">
        <SwitchButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :active="computedState.activeObservableId.value === observable.id"
          :disabled="!isObservationActive"
          @click="methods.handleSwitchClick(observable)"
        />
      </div>
      
      <div v-else class="buttons-container column q-gutter-y-sm">
        <PressButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :disabled="!isObservationActive"
          @click="methods.handlePressClick(observable)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, reactive } from 'vue';
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
    const state = reactive({
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 }
    });

    const computedState = {
      isContinuous: computed(() => {
        return props.category.action === ProtocolItemActionEnum.Continuous;
      }),
      activeObservableId: computed(() => {
        return props.activeObservableIdByCategoryId[props.category.id] || null;
      })
    };

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

    const handleDragMove = (event: MouseEvent | TouchEvent) => {
      if (!state.isDragging) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      let currentX: number, currentY: number;

      if ('touches' in event) {
        currentX = event.touches[0].clientX;
        currentY = event.touches[0].clientY;
      } else {
        currentX = event.clientX;
        currentY = event.clientY;
      }

      state.dragOffset = {
        x: currentX - state.dragStartPos.x,
        y: currentY - state.dragStartPos.y
      };

      const container = document.querySelector('.categories-wrapper');
      const containerRect = container?.getBoundingClientRect();
      let newX = state.initialPosition.x + state.dragOffset.x;
      let newY = state.initialPosition.y + state.dragOffset.y;

      if (containerRect) {
        const margin = 20;
        const cardWidth = 300; // From getCategoryStyle width

        if (newX < -cardWidth + margin) newX = -cardWidth + margin;
        if (newX > containerRect.width - margin) newX = containerRect.width - margin;
        if (newY < 0) newY = 0;
        if (newY > containerRect.height - 100) newY = containerRect.height - 100;
      }

      emit('move', {
        categoryId: props.category.id,
        position: { x: newX, y: newY }
      });
    };

    const handleDragEnd = () => {
      state.isDragging = false;

      emit('dragEnd', props.category.id);

      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove as EventListener);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd as EventListener);
    };

    const handleDragStart = (event: MouseEvent | TouchEvent) => {
      state.isDragging = true;

      emit('dragStart', props.category.id);

      state.initialPosition = { ...props.position };

      if ('touches' in event) {
        state.dragStartPos = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else {
        state.dragStartPos = {
          x: event.clientX,
          y: event.clientY
        };
      }

      state.dragOffset = { x: 0, y: 0 };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('touchmove', handleDragMove as EventListener, { passive: false });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd as EventListener);
    };

    const methods = {
      handleSwitchClick,
      handlePressClick,
      handleDragStart,
      handleDragMove,
      handleDragEnd
    };

    return {
      state,
      computedState,
      methods
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