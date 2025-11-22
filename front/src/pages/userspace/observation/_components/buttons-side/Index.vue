<template>
  <div class="fit q-pa-md column">
    <div class="col-auto text-h6 q-mb-md row">
      <div class="col-auto">
        Tableau de bord d'observation
      </div>
      <q-space />
      <div class="col-auto">
        <q-btn 
          :icon="state.isResetting ? 'mdi-loading mdi-spin' : 'mdi-restart'" 
          :color="state.isResetting ? 'accent' : 'grey-7'"
          flat
          round
          dense
          :disable="state.isResetting"
          tooltip="Réinitialiser la position des catégories et observables"
          @click="methods.resetPositions()"
        />
      </div>
    </div>

    <div class="col categories-wrapper" 
      ref="categoriesWrapper"
      :style="{ 'min-height': '20rem' }">
      <template v-if="sharedState.currentProtocol && sharedState.currentProtocol._items">
        <Category
          v-for="category in computedState.categories.value"
          :key="category.id"
          :category="category"
          :active-observable-id-by-category-id="state.activeObservableIdByCategoryId"
          :position="state.categoryPositions[category.id] || { x: 0, y: 0 }"
          :is-observation-active="computedState.isObservationActive.value"
          :style="methods.getCategoryStyle(category.id)"
          @switch-click="methods.handleSwitchClick"
          @press-click="methods.handlePressClick"
          @move="methods.handleCategoryMove"
          @drag-start="(id) => methods.updateDraggingState(id, true)"
          @drag-end="(id) => methods.updateDraggingState(id, false)"
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
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
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

    // Reactive state
    const state = reactive({
      isResetting: false,
      activeObservableIdByCategoryId: {} as Record<string, string>,
      categoryPositions: {} as Record<string, { x: number; y: number }>,
      isDragging: false,
      isDraggingCategoryId: null as string | null,
      hasInitializedStartReadings: false,
    });
    
    // Listen for video reading active events to auto-activate buttons
    const handleVideoReadingActive = (event: CustomEvent) => {
      const readingsByCategory = event.detail.readingsByCategory;
      
      if (!readingsByCategory) {
        // Clear all active buttons if no data
        Object.keys(state.activeObservableIdByCategoryId).forEach(key => {
          delete state.activeObservableIdByCategoryId[key];
        });
        return;
      }
      
      // For each category, activate the button corresponding to the last reading
      for (const category of computedState.categories.value) {
        // Only handle continuous categories (discrete don't need activation)
        if (category.action !== ProtocolItemActionEnum.Continuous) continue;
        
        const reading = readingsByCategory[category.id];
        
        if (reading && reading.name && category.children) {
          // Find the observable that matches the reading name
          const observable = category.children.find(
            (obs: any) => obs.name === reading.name
          );
          
          if (observable) {
            // Activate the button for this observable
            state.activeObservableIdByCategoryId[category.id] = observable.id as string;
          } else {
            // If observable not found, deactivate button for this category
            delete state.activeObservableIdByCategoryId[category.id];
          }
        } else {
          // If no reading found for this category, deactivate button
          delete state.activeObservableIdByCategoryId[category.id];
        }
      }
    };
    
    // Set up event listener
    onMounted(() => {
      window.addEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });
    
    onUnmounted(() => {
      window.removeEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });

    // Computed
    const computedState = {
      isObservationActive: computed(() => observation.sharedState.isPlaying),
      categories: computed(() => {
        if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) {
          return [] as ProtocolItem[];
        }
        return sharedState.currentProtocol._items
          .filter((item: any) => item.type === ProtocolItemTypeEnum.Category)
          .map((item: any) => item as ProtocolItem);
      }),
    };
    
    const methods = {
      // Make sure wrapper is tall enough for all categories
      updateWrapperHeight: () => {
        if (!categoriesWrapper.value) return;
        let maxY = 0;
        let maxHeight = 0;
        Object.values(state.categoryPositions).forEach(position => {
          if (position.y > maxY) {
            maxY = position.y;
            maxHeight = 250;
          }
        });
        const minHeight = maxY + maxHeight + 50;
        if (minHeight > 300) {
          categoriesWrapper.value.style.minHeight = `${minHeight}px`;
        }
      },

      // Calculate grid-based positions for categories
      calculateCategoryPositions: (forceReset = false) => {
        if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) return;
        const items = sharedState.currentProtocol._items
          .filter((item: any) => item.type === ProtocolItemTypeEnum.Category)
          .map((item: any) => item as ProtocolItem);
        let row = 0;
        let column = 0;
        const maxColumns = 2;
        const columnWidth = 220;
        const rowHeight = 250;
        items.forEach((category: ProtocolItem) => {
          if (forceReset || !state.categoryPositions[category.id]) {
            state.categoryPositions[category.id] = {
              x: column * columnWidth,
              y: row * rowHeight,
            };
          }
          column++;
          if (column >= maxColumns) {
            column = 0;
            row++;
          }
        });
        methods.updateWrapperHeight();
      },

      // Handle click on switch button (continuous category)
      handleSwitchClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        if (!computedState.isObservationActive.value) {
          methods.showObservationInactiveNotification();
          return;
        }
        if (state.activeObservableIdByCategoryId[categoryId] === observableId) {
          delete state.activeObservableIdByCategoryId[categoryId];
        } else {
          state.activeObservableIdByCategoryId[categoryId] = observableId;
        }
        methods.recordReading(categoryId, observableId);
      },

      // Handle click on press button (discrete category)
      handlePressClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        if (!computedState.isObservationActive.value) {
          methods.showObservationInactiveNotification();
          return;
        }
        methods.recordReading(categoryId, observableId);
      },

      showObservationInactiveNotification: () => {
        $q.notify({
          type: 'warning',
          message: 'Veuillez commencer l\'enregistrement avant d\'utiliser les boutons',
          position: 'top-right',
          timeout: 2000,
        });
      },

      // Record a new reading
      recordReading: (categoryId: string, observableId: string) => {
        const category = computedState.categories.value.find(
          (cat: ProtocolItem) => cat.id === categoryId
        );
        if (!category) return;
        const observable = category.children?.find(
          (obs: any) => obs.id === observableId
        ) as ProtocolItem | undefined;
        if (!observable) return;
        readings.methods.addReading({
          categoryName: category.name,
          observableName: observable.name,
          observableDescription: observable.description || '',
          currentDate: observation.sharedState.currentDate || undefined,
          elapsedTime: observation.sharedState.elapsedTime,
        });
      },

      // Handle category movement (drag & drop)
      handleCategoryMove: ({ categoryId, position }: { categoryId: string; position: { x: number; y: number } }) => {
        const currentPos = state.categoryPositions[categoryId];
        if (!currentPos || currentPos.x !== position.x || currentPos.y !== position.y) {
          state.categoryPositions[categoryId] = position;
          methods.updateWrapperHeight();
        }
      },

      // Get styles for a category
      getCategoryStyle: (categoryId: string) => {
        const position = state.categoryPositions[categoryId] || { x: 0, y: 0 };
        return {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '13rem',
          transition: state.isDragging ? 'none' : 'left 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
          zIndex: state.isDragging && state.isDraggingCategoryId === categoryId ? '100' : '1',
        } as Record<string, string>;
      },

      // Update dragging state when Category component signals drag
      updateDraggingState: (categoryId: string, isDrag: boolean) => {
        state.isDragging = isDrag;
        state.isDraggingCategoryId = isDrag ? categoryId : null;
      },

      // Resets all categories to their original grid positions
      resetPositions: () => {
        if (state.isResetting) return;
        state.isResetting = true;
        Object.keys(state.categoryPositions).forEach(key => {
          delete state.categoryPositions[key];
        });
        methods.calculateCategoryPositions(true);
        setTimeout(() => {
          state.isDragging = false;
          state.isDraggingCategoryId = null;
          $q.notify({
            type: 'positive',
            message: 'Les catégories ont été réinitialisées',
            position: 'top-right',
            timeout: 2000,
          });
          state.isResetting = false;
        }, 600);
      },

      // Initialize readings for continuous categories on first start
      createInitialContinuousReadingsIfNeeded: () => {
        if (state.hasInitializedStartReadings) return;
        if (readings.sharedState.currentReadings.length !== 1) return;
        const first = readings.sharedState.currentReadings[0];
        if (!first || first.type !== ReadingTypeEnum.START) return;
        const startDate = first.dateTime;
        // ensure insertion at end
        readings.methods.selectReading(null);
        computedState.categories.value.forEach((category: ProtocolItem) => {
          if (category.action === ProtocolItemActionEnum.Continuous && category.children && category.children.length > 0) {
            const lastObservable = category.children[category.children.length - 1] as ProtocolItem;
            // Mark button active
            state.activeObservableIdByCategoryId[category.id] = lastObservable.id as unknown as string;
            // Add reading with the same timestamp as start
            readings.methods.addReading({
              categoryName: category.name,
              observableName: (lastObservable as any).name,
              observableDescription: (lastObservable as any).description || '',
              dateTime: startDate,
            });
          }
        });
        state.hasInitializedStartReadings = true;
      },
    };

    // Initialize category positions when protocol changes
    watch(() => sharedState.currentProtocol, (newProtocol) => {
      if (newProtocol && newProtocol._items) {
        // Reset active observables
        Object.keys(state.activeObservableIdByCategoryId).forEach(key => {
          delete state.activeObservableIdByCategoryId[key];
        });
        state.hasInitializedStartReadings = false;
        // Initialize positions if not already set
        methods.calculateCategoryPositions();
      }
    }, { immediate: true });

    // Update wrapper height based on category positions
    watch(state.categoryPositions, () => {
      methods.updateWrapperHeight();
    }, { deep: true });

    onMounted(() => {
      methods.calculateCategoryPositions();
      methods.updateWrapperHeight();
      // Set up event listener for video reading active
      window.addEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });
    
    onUnmounted(() => {
      window.removeEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });

    // Trigger initial continuous readings when starting from zero
    watch(() => observation.sharedState.isPlaying, (playing, prev) => {
      if (playing && !state.hasInitializedStartReadings) {
        methods.createInitialContinuousReadingsIfNeeded();
      }
    });

    return {
      sharedState,
      observation,
      state,
      computedState,
      categoriesWrapper,
      methods,
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
