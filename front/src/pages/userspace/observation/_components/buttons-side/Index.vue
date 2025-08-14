<template>
  <div class="fit q-pa-md column">
    <div class="col-auto text-h6 q-mb-md row">
      <div class="col-auto">
        Tableau de bord d'observation
      </div>
      <q-space />
      <div class="col-auto">
        <q-btn 
          :icon="isResetting ? 'mdi-loading mdi-spin' : 'mdi-restart'" 
          :color="isResetting ? 'accent' : 'grey-7'"
          flat
          round
          dense
          :disable="isResetting"
          tooltip="Réinitialiser la position des catégories et observables"
          @click="resetPositions"
        />
      </div>
    </div>

    <div class="col categories-wrapper" 
      ref="categoriesWrapper"
      :style="{ 'min-height': '20rem' }">
      <template v-if="sharedState.currentProtocol && sharedState.currentProtocol._items">
        <Category
          v-for="category in categories"
          :key="category.id"
          :category="category"
          :active-observable-id-by-category-id="activeObservableIdByCategoryId"
          :position="categoryPositions[category.id] || { x: 0, y: 0 }"
          :is-observation-active="isObservationActive"
          :style="getCategoryStyle(category.id)"
          @switch-click="handleSwitchClick"
          @press-click="handlePressClick"
          @move="handleCategoryMove"
          @drag-start="(id) => updateDraggingState(id, true)"
          @drag-end="(id) => updateDraggingState(id, false)"
        />
      </template>
      <div v-else class="no-data text-center q-pa-lg">
        <q-icon name="info" size="2rem" color="grey-7" />
        <div class="text-subtitle1 q-mt-sm">Aucun protocole chargé</div>
        <div class="text-caption q-mt-xs">Veuillez sélectionner une observation pour afficher son protocole.</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, watch } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { ProtocolItem, ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { ReadingTypeEnum } from '@services/observations/interface';
import Category from './Category.vue';
import { useQuasar } from 'quasar';

export default defineComponent({
  name: 'ButtonsSideIndex',

  components: {
    Category
  },

  setup() {
    const $q = useQuasar();
    const observation = useObservation();
    const protocol = observation.protocol;
    const readings = observation.readings;
    const { sharedState } = protocol;
    const categoriesWrapper = ref<HTMLElement | null>(null);
    
    // Check if buttons should be enabled based on observation status
    const isObservationActive = computed(() => observation.sharedState.isPlaying);
    
    // State to track if we're currently resetting positions
    const isResetting = ref(false);

    // State for tracking active observables in continuous categories
    const activeObservableIdByCategoryId = reactive<Record<string, string>>({});
    
    // Store positions of categories for drag & drop
    const categoryPositions = reactive<Record<string, { x: number; y: number }>>({});
    
    // Get categories from the protocol
    const categories = computed(() => {
      if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) {
        return [] as ProtocolItem[];
      }
      
      return sharedState.currentProtocol._items
        .filter((item: any) => item.type === ProtocolItemTypeEnum.Category)
        .map((item: any) => item as ProtocolItem);
    });
    
    // Make sure wrapper is tall enough for all categories
    const updateWrapperHeight = () => {
      if (!categoriesWrapper.value) return;
      
      // Find the category with the largest y-position
      let maxY = 0;
      let maxHeight = 0;
      
      Object.values(categoryPositions).forEach(position => {
        if (position.y > maxY) {
          maxY = position.y;
          maxHeight = 250; // Approximate height of a category card
        }
      });
      
      const minHeight = maxY + maxHeight + 50; // Add padding
      if (minHeight > 300) {
        categoriesWrapper.value.style.minHeight = `${minHeight}px`;
      }
    };

    // Calculate grid-based positions for categories
    const calculateCategoryPositions = (forceReset = false) => {
      if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) return;
      
      const items = sharedState.currentProtocol._items
        .filter((item: any) => item.type === ProtocolItemTypeEnum.Category)
        .map((item: any) => item as ProtocolItem);
      
      let row = 0;
      let column = 0;
      const maxColumns = 2; // Number of columns for layout
      const columnWidth = 220; // Width of each column with some spacing
      const rowHeight = 250; // Approximate height of a category card
      
      items.forEach((category: ProtocolItem) => {
        // Only set position if we're doing a force reset or the category doesn't have a position yet
        if (forceReset || !categoryPositions[category.id]) {
          categoryPositions[category.id] = {
            x: column * columnWidth,
            y: row * rowHeight
          };
        }
        
        column++;
        if (column >= maxColumns) {
          column = 0;
          row++;
        }
      });
      
      // Update the wrapper height after positions are calculated
      updateWrapperHeight();
    };

    // Initialize category positions when protocol changes
    watch(() => sharedState.currentProtocol, (newProtocol) => {
      if (newProtocol && newProtocol._items) {
        // Reset active observables
        Object.keys(activeObservableIdByCategoryId).forEach(key => {
          delete activeObservableIdByCategoryId[key];
        });

        // Initialize positions if not already set
        calculateCategoryPositions();
      }
    }, { immediate: true });

    // Update wrapper height based on category positions
    watch(categoryPositions, () => {
      updateWrapperHeight();
    }, { deep: true });

    onMounted(() => {
      calculateCategoryPositions();
      updateWrapperHeight();
    });
    
    // Handle click on switch button (continuous category)
    const handleSwitchClick = ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
      // Don't process clicks if observation is not active
      if (!isObservationActive.value) {
        showObservationInactiveNotification();
        return;
      }
      
      // Toggle the active state
      if (activeObservableIdByCategoryId[categoryId] === observableId) {
        // If clicking on already active button, deactivate it
        delete activeObservableIdByCategoryId[categoryId];
      } else {
        // Activate the clicked button and deactivate others in the same category
        activeObservableIdByCategoryId[categoryId] = observableId;
      }
      
      // Record the reading
      recordReading(categoryId, observableId);
    };

    // Handle click on press button (discrete category)
    const handlePressClick = ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
      // Don't process clicks if observation is not active
      if (!isObservationActive.value) {
        showObservationInactiveNotification();
        return;
      }
      
      // Just record the reading, no state to maintain for discrete buttons
      recordReading(categoryId, observableId);
    };

    // Show notification when buttons are clicked while observation is inactive
    const showObservationInactiveNotification = () => {
      $q.notify({
        type: 'warning',
        message: 'Veuillez commencer l\'enregistrement avant d\'utiliser les boutons',
        position: 'top-right',
        timeout: 2000
      });
    };

    // Record a new reading
    const recordReading = (categoryId: string, observableId: string) => {
      // Find the category and observable names
      const category = categories.value.find(
        (cat: ProtocolItem) => cat.id === categoryId
      );
      if (!category) return;
      
      const observable = category.children?.find(
        (obs: any) => obs.id === observableId
      ) as ProtocolItem | undefined;
      
      if (!observable) return;
      
      // Create the reading using the composable's createReading method
      const newReading = readings.methods.addReading({
        categoryName: category.name,
        observableName: observable.name,
        observableDescription: observable.description || '',
        currentDate: observation.sharedState.currentDate || undefined,
        elapsedTime: observation.sharedState.elapsedTime
      });

    };

    // Handle category movement (drag & drop)
    const handleCategoryMove = ({ categoryId, position }: { categoryId: string; position: { x: number; y: number } }) => {
      // Avoid unnecessary re-renders by checking if position actually changed
      const currentPos = categoryPositions[categoryId];
      if (!currentPos || currentPos.x !== position.x || currentPos.y !== position.y) {
        categoryPositions[categoryId] = position;
        
        // Update wrapper height to accommodate new position
        updateWrapperHeight();
      }
    };

    // Track dragging state
    const isDragging = ref(false);
    const isDraggingCategoryId = ref<string | null>(null);

    // Get styles for a category
    const getCategoryStyle = (categoryId: string) => {
      const position = categoryPositions[categoryId] || { x: 0, y: 0 };
      return {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '13rem',
        transition: isDragging.value ? 'none' : 'left 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)', // Improved transition
        zIndex: isDragging.value && isDraggingCategoryId.value === categoryId ? '100' : '1'
      };
    };

    // Update dragging state when Category component signals drag
    const updateDraggingState = (categoryId: string, isDrag: boolean) => {
      isDragging.value = isDrag;
      isDraggingCategoryId.value = isDrag ? categoryId : null;
    };

    // Resets all categories to their original grid positions
    const resetPositions = () => {
      // Prevent multiple resets
      if (isResetting.value) return;
      
      // Set resetting state
      isResetting.value = true;
      
      // Clear all existing positions
      Object.keys(categoryPositions).forEach(key => {
        delete categoryPositions[key];
      });
      
      // Recalculate original grid layout with force reset
      calculateCategoryPositions(true);
      
      // Add a small animation delay to make the transition smooth
      setTimeout(() => {
        isDragging.value = false;
        isDraggingCategoryId.value = null;
        
        // Show a notification to the user
        $q.notify({
          type: 'positive',
          message: 'Les catégories ont été réinitialisées',
          position: 'top-right',
          timeout: 2000
        });
        
        // Reset the loading state
        isResetting.value = false;
      }, 600); // Longer animation time for a smoother effect
    };

    return {
      sharedState,
      observation,
      isObservationActive,
      categories,
      activeObservableIdByCategoryId,
      categoryPositions,
      categoriesWrapper,
      isResetting,
      handleSwitchClick,
      handlePressClick,
      handleCategoryMove,
      getCategoryStyle,
      updateDraggingState,
      resetPositions
    };
  }
});
</script>

<style scoped>
.categories-wrapper {
  position: relative;
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 16px;
  background-color: #fcfcfc;
  overflow: hidden;
  min-height: 20rem;
}

.no-data {
  color: #777;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 15rem;
}
</style>
