<template>
  <div class="dashboard-container q-pa-md">
    <div class="text-h6 q-mb-md">Tableau de bord</div>

    <div class="row q-col-gutter-md">
      <!-- Dashboard cards -->
      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">Relevés en cours</div>
            <div class="text-h4 q-mt-sm">{{ activeReadingsCount }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">Total observations</div>
            <div class="text-h4 q-mt-sm">{{ totalObservations }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">Durée de la session</div>
            <div class="text-h4 q-mt-sm">{{ sessionDuration }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">Statut</div>
            <div class="text-h4 q-mt-sm">
              <q-badge :color="sessionStatus.color">{{
                sessionStatus.label
              }}</q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick action buttons -->
    <div class="q-mt-lg">
      <div class="text-subtitle1 q-mb-sm">Actions rapides</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6">
          <q-btn
            color="primary"
            class="full-width"
            icon="add"
            label="Nouveau relevé"
          />
        </div>
        <div class="col-6">
          <q-btn
            color="secondary"
            class="full-width"
            icon="summarize"
            label="Rapport"
          />
        </div>
        <div class="col-6">
          <q-btn
            color="accent"
            class="full-width"
            icon="fact_check"
            label="Vérifier données"
          />
        </div>
        <div class="col-6">
          <q-btn
            color="info"
            class="full-width"
            icon="settings"
            label="Paramètres"
          />
        </div>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="q-mt-lg">
      <div class="text-subtitle1 q-mb-sm">Activité récente</div>
      <q-list bordered separator>
        <q-item
          v-for="(activity, index) in recentActivities"
          :key="index"
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon :name="activity.icon" :color="activity.iconColor" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ activity.title }}</q-item-label>
            <q-item-label caption>{{ activity.timestamp }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ButtonsSideIndex',

  setup() {
    const activeReadingsCount = ref(0);
    const totalObservations = ref(142);
    const sessionDuration = ref('00:45:23');

    const sessionStatus = ref({
      label: 'Inactif',
      color: 'grey',
    });

    const recentActivities = ref([
      {
        icon: 'add',
        iconColor: 'positive',
        title: 'Relevé #32 ajouté',
        timestamp: 'Il y a 5 minutes',
      },
      {
        icon: 'edit',
        iconColor: 'warning',
        title: 'Relevé #30 modifié',
        timestamp: 'Il y a 15 minutes',
      },
      {
        icon: 'delete',
        iconColor: 'negative',
        title: 'Relevé #28 supprimé',
        timestamp: 'Il y a 30 minutes',
      },
      {
        icon: 'play_arrow',
        iconColor: 'primary',
        title: 'Session démarrée',
        timestamp: 'Il y a 45 minutes',
      },
    ]);

    return {
      activeReadingsCount,
      totalObservations,
      sessionDuration,
      sessionStatus,
      recentActivities,
    };
  },
});
</script>

<style scoped>
.dashboard-container {
  height: 100%;
  overflow-y: auto;
}

.dashboard-card {
  background-color: #f9f9f9;
  transition: all 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}
</style>
