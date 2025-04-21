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
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useReadings } from 'src/composables/use-observation/use-readings';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { v4 as uuidv4 } from 'uuid';
import ReadingsToolbar from './ReadingsToolbar.vue';
import ReadingsTable from './ReadingsTable.vue';

export default defineComponent({
  name: 'ReadingsSideIndex',
  
  components: {
    ReadingsToolbar,
    ReadingsTable,
  },

  setup() {
    // Use the readings composable
    const { sharedState, methods } = useReadings();
    
    // Local state
    const search = ref('');
    const selectedReading = ref<IReading[]>([]);
    
    // Watch for selection changes to update the composable's selected reading
    watch(selectedReading, (newValue) => {
      methods.selectReading(newValue.length > 0 ? newValue[0] : null);
    }, { immediate: true });
    
    // Computed property to check if a reading is selected
    const hasSelectedReading = computed(() => {
      return selectedReading.value.length > 0;
    });
    
    // Filtered readings based on search
    const filteredReadings = computed(() => {
      let result = [...sharedState.currentReadings];

      // Apply search filter
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
    const handleAddReading = () => {
      // Clear current selection before adding
      selectedReading.value = [];
      
      // Add the reading using the composable method
      const newReading = methods.addReading();
      
      // Set the new reading as the selected reading after a small delay
      setTimeout(() => {
        selectedReading.value = [newReading];
      }, 0);
    };

    const handleRemoveAllReadings = () => {
      methods.removeAllReadings();
    }

    // Handler for removing a reading
    const handleRemoveReading = () => {
      if (selectedReading.value.length === 0) return;
      
      // Get the ID of the reading to remove
      const readingId = selectedReading.value[0].id;
      
      // Remove the reading using the composable method
      methods.removeReading(readingId);
      
      // Clear the selection
      selectedReading.value = [];
    };

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
