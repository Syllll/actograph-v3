<template>
  <div
    class="readings-container q-pa-md"
    style="min-width: 600px; overflow-x: auto"
  >
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h6">Relevés</div>

      <div class="row q-gutter-sm">
        <!-- Filter and view options -->
        <q-select
          v-model="filter"
          :options="filterOptions"
          outlined
          dense
          label="Filtrer"
          class="q-mr-sm"
          style="min-width: 150px"
        />

        <q-btn-group outline>
          <q-btn
            outline
            icon="list"
            :color="viewMode === 'list' ? 'primary' : 'grey'"
            @click="viewMode = 'list'"
          />
          <q-btn
            outline
            icon="grid_view"
            :color="viewMode === 'grid' ? 'primary' : 'grey'"
            @click="viewMode = 'grid'"
          />
          <q-btn
            outline
            icon="timeline"
            :color="viewMode === 'timeline' ? 'primary' : 'grey'"
            @click="viewMode = 'timeline'"
          />
        </q-btn-group>

        <q-btn color="primary" icon="add" label="Nouveau" />
      </div>
    </div>

    <!-- Search bar -->
    <q-input
      v-model="search"
      outlined
      dense
      placeholder="Rechercher des relevés..."
      class="q-mb-md"
      clearable
    >
      <template v-slot:append>
        <q-icon name="search" />
      </template>
    </q-input>

    <!-- List view mode -->
    <div v-if="viewMode === 'list'">
      <q-list bordered separator>
        <q-item
          v-for="reading in filteredReadings"
          :key="reading.id"
          clickable
          v-ripple
        >
          <q-item-section>
            <q-item-label>{{ reading.title }}</q-item-label>
            <q-item-label caption>
              <span class="text-weight-bold">ID:</span> {{ reading.id }} |
              <span class="text-weight-bold">Date:</span> {{ reading.date }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-badge
              :color="reading.status === 'completed' ? 'positive' : 'warning'"
            >
              {{ reading.status }}
            </q-badge>
          </q-item-section>

          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn flat round dense icon="edit" color="primary" size="sm" />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                size="sm"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Grid view mode -->
    <div v-else-if="viewMode === 'grid'">
      <div class="row q-col-gutter-md">
        <div
          v-for="reading in filteredReadings"
          :key="reading.id"
          class="col-12 col-md-6 col-lg-4"
        >
          <q-card class="reading-card">
            <q-card-section>
              <div class="text-h6">{{ reading.title }}</div>
              <div class="text-caption">ID: {{ reading.id }}</div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <div class="row items-center">
                <q-icon
                  name="event"
                  color="primary"
                  size="sm"
                  class="q-mr-xs"
                />
                <span>{{ reading.date }}</span>
              </div>
              <div class="row items-center q-mt-xs">
                <q-icon name="info" color="primary" size="sm" class="q-mr-xs" />
                <span>{{ reading.description }}</span>
              </div>
            </q-card-section>

            <q-card-actions align="right">
              <q-badge
                class="q-mr-md"
                :color="reading.status === 'completed' ? 'positive' : 'warning'"
              >
                {{ reading.status }}
              </q-badge>
              <q-btn flat round icon="edit" color="primary" />
              <q-btn flat round icon="delete" color="negative" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Timeline view mode -->
    <div v-else-if="viewMode === 'timeline'">
      <div class="timeline-container q-pa-md">
        <q-timeline color="primary">
          <q-timeline-entry
            v-for="reading in filteredReadings"
            :key="reading.id"
            :title="reading.title"
            :subtitle="reading.date"
            :icon="reading.status === 'completed' ? 'check_circle' : 'pending'"
            :color="reading.status === 'completed' ? 'positive' : 'warning'"
          >
            <div>{{ reading.description }}</div>

            <div class="row justify-end q-gutter-xs q-mt-sm">
              <q-btn flat round dense icon="edit" color="primary" size="sm" />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                size="sm"
              />
            </div>
          </q-timeline-entry>
        </q-timeline>
      </div>
    </div>

    <!-- Pagination controls -->
    <div class="row justify-center q-mt-md">
      <q-pagination
        v-model="currentPage"
        :max="totalPages"
        direction-links
        boundary-links
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';

export default defineComponent({
  name: 'ReadingsSideIndex',

  setup() {
    const search = ref('');
    const viewMode = ref('list'); // 'list', 'grid', or 'timeline'
    const currentPage = ref(1);
    const totalPages = ref(5);
    const filter = ref('all');

    const filterOptions = [
      { label: 'Tous', value: 'all' },
      { label: 'Complétés', value: 'completed' },
      { label: 'En cours', value: 'in-progress' },
    ];

    const readings = ref([
      {
        id: 'R001',
        title: 'Relevé principale',
        description: 'Description du relevé principale et ses caractéristiques',
        date: '2023-06-15 09:30',
        status: 'completed',
      },
      {
        id: 'R002',
        title: 'Relevé secondaire',
        description:
          'Description du relevé secondaire et ses détails spécifiques',
        date: '2023-06-15 10:45',
        status: 'in-progress',
      },
      {
        id: 'R003',
        title: 'Relevé de contrôle',
        description: 'Description du relevé de contrôle et ses métriques',
        date: '2023-06-14 14:20',
        status: 'completed',
      },
      {
        id: 'R004',
        title: 'Relevé expérimental',
        description: 'Description du relevé expérimental et ses paramètres',
        date: '2023-06-14 16:05',
        status: 'in-progress',
      },
      {
        id: 'R005',
        title: 'Relevé de vérification',
        description: 'Description du relevé de vérification et ses critères',
        date: '2023-06-13 11:30',
        status: 'completed',
      },
    ]);

    const filteredReadings = computed(() => {
      let result = [...readings.value];

      // Apply search filter
      if (search.value) {
        const searchLower = search.value.toLowerCase();
        result = result.filter(
          (reading) =>
            reading.title.toLowerCase().includes(searchLower) ||
            reading.description.toLowerCase().includes(searchLower) ||
            reading.id.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (filter.value !== 'all') {
        result = result.filter((reading) => reading.status === filter.value);
      }

      return result;
    });

    return {
      search,
      viewMode,
      currentPage,
      totalPages,
      filter,
      filterOptions,
      readings,
      filteredReadings,
    };
  },
});
</script>

<style scoped>
.readings-container {
  height: 100%;
  overflow-y: auto;
  position: relative;
  width: 100%;
}

.reading-card {
  transition: all 0.3s ease;
  min-width: 250px;
}

.reading-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.timeline-container {
  max-height: calc(100% - 120px);
  overflow-y: auto;
  min-width: 550px;
}

/* Ensure grid items don't get too compressed */
@media (max-width: 800px) {
  .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
