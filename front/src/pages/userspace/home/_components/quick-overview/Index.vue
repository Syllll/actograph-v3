<template>
  <div class="quick-overview">
    <div class="overview-header row items-center justify-between q-mb-md">
      <div class="text-subtitle1 text-weight-bold text-primary">
        📊 Aperçu rapide
      </div>
      <q-btn
        v-if="hasReadings"
        label="Voir le graphe"
        icon-right="mdi-arrow-right"
        flat
        dense
        no-caps
        color="accent"
        size="sm"
        @click="methods.navigateToGraph"
      />
    </div>

    <template v-if="observation.sharedState.currentObservation">
      <!-- Mini timeline -->
      <div class="timeline-container q-mb-md">
        <div class="timeline-title text-caption text-grey-7 q-mb-sm">
          Activité des 7 derniers jours
        </div>
        <div class="timeline-bars">
          <div
            v-for="(day, index) in computedState.weeklyData.value"
            :key="index"
            class="day-column"
          >
            <div 
              class="bar" 
              :style="{ height: `${day.height}%` }"
              :class="{ 'bar-empty': day.count === 0, 'bar-today': day.isToday }"
            >
              <q-tooltip>
                {{ day.label }}: {{ day.count }} relevé{{ day.count > 1 ? 's' : '' }}
              </q-tooltip>
            </div>
            <div class="day-label">{{ day.shortLabel }}</div>
          </div>
        </div>
        <div class="timeline-summary text-center q-mt-sm">
          <span class="text-h6 text-weight-bold text-accent">{{ computedState.weekTotal.value }}</span>
          <span class="text-body2 text-grey-7"> relevés cette semaine</span>
        </div>
      </div>

      <!-- Stats rapides -->
      <div class="stats-grid">
        <div class="stat-item">
          <q-icon name="mdi-database" size="sm" color="primary" />
          <div class="stat-value">{{ computedState.totalReadings.value }}</div>
          <div class="stat-label">Total relevés</div>
        </div>
        <div class="stat-item">
          <q-icon name="mdi-eye" size="sm" color="primary" />
          <div class="stat-value">{{ computedState.observablesCount.value }}</div>
          <div class="stat-label">Observables</div>
        </div>
        <div class="stat-item">
          <q-icon name="mdi-clock-outline" size="sm" color="primary" />
          <div class="stat-value">{{ computedState.lastReadingText.value }}</div>
          <div class="stat-label">Dernier relevé</div>
        </div>
      </div>

      <!-- Bouton d'action contextuel -->
      <div class="action-cta q-mt-md">
        <q-btn
          :label="computedState.ctaLabel.value"
          :icon="computedState.ctaIcon.value"
          color="accent"
          no-caps
          class="full-width"
          @click="methods.handleCtaClick"
        />
      </div>
    </template>

    <!-- État vide -->
    <template v-else>
      <div class="empty-state">
        <q-icon name="mdi-chart-timeline-variant" size="xl" color="grey-5" class="q-mb-sm" />
        <div class="text-body2 text-grey-7 text-center">
          Chargez une chronique pour voir l'aperçu
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { useRouter } from 'vue-router';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';

export default defineComponent({
  name: 'QuickOverview',
  setup() {
    const observation = useObservation();
    const router = useRouter();

    const hasReadings = computed(() => {
      return observation.readings.sharedState.currentReadings.length > 0;
    });

    const hasObservables = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) return false;
      let count = 0;
      count += protocol._items.filter((item: any) => item.type === ProtocolItemTypeEnum.Observable).length;
      protocol._items.forEach((item: any) => {
        if (item.type === ProtocolItemTypeEnum.Category && item.children) {
          count += item.children.filter((child: any) => child.type === ProtocolItemTypeEnum.Observable).length;
        }
      });
      return count > 0;
    });

    const computedState = {
      totalReadings: computed(() => observation.readings.sharedState.currentReadings.length),

      observablesCount: computed(() => {
        const protocol = observation.protocol.sharedState.currentProtocol;
        if (!protocol || !protocol._items) return 0;
        let count = 0;
        count += protocol._items.filter((item: any) => item.type === ProtocolItemTypeEnum.Observable).length;
        protocol._items.forEach((item: any) => {
          if (item.type === ProtocolItemTypeEnum.Category && item.children) {
            count += item.children.filter((child: any) => child.type === ProtocolItemTypeEnum.Observable).length;
          }
        });
        return count;
      }),

      lastReadingText: computed(() => {
        const readings = observation.readings.sharedState.currentReadings;
        if (readings.length === 0) return '-';
        
        const sorted = [...readings].sort((a, b) => {
          return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
        });
        
        const lastDate = new Date(sorted[0].dateTime);
        const now = new Date();
        const diffMs = now.getTime() - lastDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}j`;
      }),

      weeklyData: computed(() => {
        const readings = observation.readings.sharedState.currentReadings;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const days = [];
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          
          const count = readings.filter((r: any) => {
            const rDate = new Date(r.dateTime);
            return rDate >= startOfDay && rDate <= endOfDay;
          }).length;
          
          days.push({
            date,
            count,
            label: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }),
            shortLabel: dayNames[date.getDay()],
            isToday: i === 0,
          });
        }
        
        const maxCount = Math.max(...days.map(d => d.count), 1);
        return days.map(d => ({
          ...d,
          height: Math.max((d.count / maxCount) * 100, 5),
        }));
      }),

      weekTotal: computed(() => {
        const data = computedState.weeklyData.value;
        return data.reduce((sum, d) => sum + d.count, 0);
      }),

      ctaLabel: computed(() => {
        if (!hasObservables.value) return 'Créer mon protocole';
        if (!hasReadings.value) return 'Faire mon observation';
        return 'Continuer';
      }),

      ctaIcon: computed(() => {
        if (!hasObservables.value) return 'mdi-flask-outline';
        if (!hasReadings.value) return 'mdi-binoculars';
        return 'mdi-arrow-right';
      }),
    };

    const methods = {
      navigateToGraph: () => {
        router.push({ name: 'user_analyse' });
      },

      handleCtaClick: () => {
        if (!hasObservables.value) {
          router.push({ name: 'user_protocol' });
        } else if (!hasReadings.value) {
          router.push({ name: 'user_observation' });
        } else {
          router.push({ name: 'user_observation' });
        }
      },
    };

    return {
      observation,
      hasReadings,
      computedState,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.quick-overview {
  background: var(--background);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(31, 41, 55, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-container {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.03) 0%, rgba(31, 41, 55, 0.06) 100%);
  border-radius: 0.5rem;
  padding: 1rem;
}

.timeline-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 80px;
  gap: 0.5rem;
}

.day-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 30px;
  background: linear-gradient(180deg, var(--accent) 0%, var(--accent-medium) 100%);
  border-radius: 0.25rem 0.25rem 0 0;
  min-height: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-top: auto;
  
  &:hover {
    transform: scaleY(1.05);
    opacity: 0.9;
  }
  
  &.bar-empty {
    background: rgba(31, 41, 55, 0.15);
  }
  
  &.bar-today {
    box-shadow: 0 0 8px var(--accent);
  }
}

.day-label {
  font-size: 0.65rem;
  color: rgba(31, 41, 55, 0.6);
  margin-top: 0.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: rgba(31, 41, 55, 0.03);
  border-radius: 0.5rem;
  
  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
    margin: 0.25rem 0;
  }
  
  .stat-label {
    font-size: 0.7rem;
    color: rgba(31, 41, 55, 0.6);
  }
}

.action-cta {
  margin-top: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
</style>

