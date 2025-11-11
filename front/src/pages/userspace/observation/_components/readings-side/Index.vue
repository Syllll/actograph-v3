<template>
  <div class="fit q-pa-md column">
    <!-- Toolbar with search, add, and remove buttons -->
    <readings-toolbar
      class="col-auto"
      v-model:search="search"
      :has-selected="hasSelectedReading"
      :is-add-disabled="false"
      @add-reading="handleAddReading"
      @remove-reading="handleRemoveReading"
      @remove-all-readings="handleRemoveAllReadings"
    />

    <DScrollArea class="col">
      <!-- Table with virtual scrolling -->
      <readings-table
        :readings="filteredReadings"
        v-model:selected="selectedReading"
      />
    </DScrollArea>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useReadings } from 'src/composables/use-observation/use-readings';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { v4 as uuidv4 } from 'uuid';
import ReadingsToolbar from './ReadingsToolbar.vue';
import ReadingsTable from './ReadingsTable.vue';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'ReadingsSideIndex',
  
  components: {
    ReadingsToolbar,
    ReadingsTable,
  },

  setup() {
    const observation = useObservation();
    // Use the readings composable to access shared state and methods
    const { sharedState, methods } = observation.readings;

    // Local state for this component
    const search = ref('');
    const selectedReading = ref<IReading[]>([]);
    
    // Watch for selection changes to keep the composable's selected reading in sync
    // This ensures that other components can access the selected reading via the composable
    watch(selectedReading, (newValue) => {
      methods.selectReading(newValue.length > 0 ? newValue[0] : null);
    }, { immediate: true });
    
    // Computed property to check if a reading is selected
    // Used to enable/disable the remove button in the toolbar
    const hasSelectedReading = computed(() => {
      return selectedReading.value.length > 0;
    });
    
    // Filtered readings based on search query
    // This computed property filters the current readings by name, id, or description
    const filteredReadings = computed(() => {
      let result = [...sharedState.currentReadings];

      // Apply search filter if search query exists
      if (search.value) {
        const searchLower = search.value.toLowerCase();
        result = result.filter(
          (reading) =>
            reading.name?.toLowerCase().includes(searchLower) ||
            reading.id?.toString().toLowerCase().includes(searchLower) ||
            reading.description?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    });

    // Handler for adding a new reading
    // Behavior:
    // - If a reading is selected: creates a copy of the selected reading with all its properties
    // - If no reading is selected: creates a new empty reading
    // After creation, the new reading is automatically selected
    const handleAddReading = () => {
      let newReading: IReading;
      const wasSelected = selectedReading.value.length > 0 && selectedReading.value[0];
      
      // If a reading is selected, create a copy of it
      if (wasSelected) {
        const selected = selectedReading.value[0];
        
        // Create a copy of the selected reading with all its properties
        // Use a slightly later dateTime (+1 second) to avoid exact duplicates
        const copiedDateTime = selected.dateTime 
          ? new Date(new Date(selected.dateTime).getTime() + 1000) // Add 1 second
          : new Date();
        
        newReading = methods.addReading({
          name: selected.name,
          description: selected.description,
          type: selected.type,
          dateTime: copiedDateTime,
        });
      } else {
        // No selection, create a new empty reading with default values
        newReading = methods.addReading();
      }
      
      // Use nextTick to ensure the reading is added to the reactive array before selecting
      // This is important because Vue's reactivity needs to process the array update first
      nextTick(() => {
        // Find the reading in the current readings array by tempId or id
        // This ensures we use the correct reference from the reactive array
        const readingToSelect = sharedState.currentReadings.find(
          (r: IReading) => 
            (newReading.tempId && r.tempId === newReading.tempId) ||
            (newReading.id && r.id === newReading.id)
        );
        
        if (readingToSelect) {
          // Use the reading from the array to ensure proper reactivity
          selectedReading.value = [readingToSelect];
        } else {
          // Fallback: use the returned reading (should not happen in normal flow)
          selectedReading.value = [newReading];
        }
      });
    };

    // Handler for removing all readings
    // This clears the entire readings list
    const handleRemoveAllReadings = () => {
      methods.removeAllReadings();
      // Clear selection after removing all readings
      selectedReading.value = [];
    }

    // Handler for removing a reading
    // This handler removes the currently selected reading from the list
    // It supports both readings with an id (persisted) and tempId (newly created)
    const handleRemoveReading = () => {
      // Safety check: ensure we have a selected reading
      if (selectedReading.value.length === 0 || !selectedReading.value[0]) {
        return;
      }
      
      const readingToRemove = selectedReading.value[0];
      
      // Remove the reading using the composable method
      // Pass the reading object itself so the method can use either id or tempId
      const wasRemoved = methods.removeReading(readingToRemove);
      
      // Clear the selection after removal
      // This ensures the UI reflects that no reading is selected
      if (wasRemoved) {
        selectedReading.value = [];
      }
    };

    // Lifecycle hook: synchronize readings when component is unmounted
    // This ensures any pending changes are saved to the backend before the component is destroyed
    onUnmounted(async () => {
      // When unmounted, trigger the sync to persist any changes
      await methods.synchronizeReadings();
    })

    return {
      search,
      selectedReading,
      hasSelectedReading,
      filteredReadings,
      handleAddReading,
      handleRemoveReading,
      handleRemoveAllReadings,
    };
  },
});
</script>

<style scoped>
</style>
