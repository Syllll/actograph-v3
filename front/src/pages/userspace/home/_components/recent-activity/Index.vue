<template>
  <div class="recent-activity">
    <div class="activity-header q-mb-md">
      <div class="text-subtitle1 text-weight-bold text-primary">
        ⏱️ Activité récente
      </div>
    </div>

    <template v-if="computedState.activities.value.length > 0">
      <q-list dense class="activity-list">
        <q-item
          v-for="(activity, index) in computedState.activities.value"
          :key="index"
          class="activity-item"
        >
          <q-item-section avatar>
            <q-icon 
              :name="activity.icon" 
              :color="activity.color"
              size="sm"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label class="activity-label">
              {{ activity.label }}
            </q-item-label>
            <q-item-label caption class="activity-time">
              {{ activity.timeAgo }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </template>

    <!-- État vide -->
    <template v-else>
      <div class="empty-state">
        <q-icon name="mdi-history" size="lg" color="grey-5" class="q-mb-sm" />
        <div class="text-body2 text-grey-6 text-center">
          Pas encore d'activité
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';

interface Activity {
  type: string;
  label: string;
  icon: string;
  color: string;
  date: Date;
  timeAgo: string;
}

export default defineComponent({
  name: 'RecentActivity',
  setup() {
    const observation = useObservation();

    const formatTimeAgo = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    const computedState = {
      activities: computed((): Activity[] => {
        const activities: Activity[] = [];
        const currentObs = observation.sharedState.currentObservation;

        if (!currentObs) return [];

        // Activité: Chronique créée
        if (currentObs.createdAt) {
          activities.push({
            type: 'chronicle_created',
            label: `Chronique "${currentObs.name}" créée`,
            icon: 'mdi-folder-plus',
            color: 'primary',
            date: new Date(currentObs.createdAt),
            timeAgo: formatTimeAgo(new Date(currentObs.createdAt)),
          });
        }

        // Activité: Dernière modification de la chronique
        if (currentObs.updatedAt && currentObs.updatedAt !== currentObs.createdAt) {
          activities.push({
            type: 'chronicle_updated',
            label: 'Chronique mise à jour',
            icon: 'mdi-pencil',
            color: 'accent',
            date: new Date(currentObs.updatedAt),
            timeAgo: formatTimeAgo(new Date(currentObs.updatedAt)),
          });
        }

        // Activités: Derniers relevés
        const readings = observation.readings.sharedState.currentReadings;
        if (readings.length > 0) {
          const sortedReadings = [...readings]
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
            .slice(0, 5);

          sortedReadings.forEach((reading, index) => {
            const date = new Date(reading.dateTime);
            activities.push({
              type: 'reading_added',
              label: index === 0 ? 'Dernier relevé ajouté' : `Relevé #${readings.length - index}`,
              icon: 'mdi-plus-circle',
              color: 'success',
              date,
              timeAgo: formatTimeAgo(date),
            });
          });
        }

        // Trier par date décroissante et limiter à 6 éléments
        return activities
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 6);
      }),
    };

    return {
      computedState,
    };
  },
});
</script>

<style lang="scss" scoped>
.recent-activity {
  background: var(--background);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(31, 41, 55, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.activity-list {
  flex: 1;
  overflow-y: auto;
}

.activity-item {
  padding: 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.25rem;
  min-height: auto;
  
  &:hover {
    background: rgba(31, 41, 55, 0.03);
  }
}

.activity-label {
  font-size: 0.85rem;
  color: var(--primary);
  word-break: break-word;
}

.activity-time {
  font-size: 0.7rem;
  color: rgba(31, 41, 55, 0.5);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
</style>

