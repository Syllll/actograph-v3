<template>
  <div class="active-chronicle">
    <template v-if="observation.sharedState.currentObservation">
      <div class="chronicle-header q-pa-md q-mb-sm">
        <div class="row items-center q-mb-xs">
          <div class="text-h5 text-weight-bold text-primary col">
            {{ observation.sharedState.currentObservation.name }}
          </div>
        </div>
        <div v-if="observation.sharedState.currentObservation.description" class="text-body2 text-grey-8 q-mb-sm">
          {{ observation.sharedState.currentObservation.description }}
        </div>
        <div class="row items-center q-gutter-x-md text-body2 text-grey-7">
          <span>
            <q-icon name="mdi-database" size="xs" class="q-mr-xs" />
            {{ readingsCount }}
            {{
              readingsCount === 1
                ? $t('activeChronicle.readingSingular')
                : $t('activeChronicle.readingPlural')
            }}
          </span>
          <span>
            <q-icon name="mdi-folder-multiple" size="xs" class="q-mr-xs" />
            {{ categoriesCount }}
            {{
              categoriesCount === 1
                ? $t('activeChronicle.categorySingular')
                : $t('activeChronicle.categoryPlural')
            }}
          </span>
          <span>
            <q-icon name="mdi-eye" size="xs" class="q-mr-xs" />
            {{ observablesCount }}
            {{
              observablesCount === 1
                ? $t('activeChronicle.observableSingular')
                : $t('activeChronicle.observablePlural')
            }}
          </span>
          <span v-if="observation.sharedState.currentObservation.updatedAt">
            <q-icon name="mdi-update" size="xs" class="q-mr-xs" />
            {{ $t('activeChronicle.modifiedPrefix') }}
            {{ methods.formatRelativeDate(observation.sharedState.currentObservation.updatedAt) }}
          </span>
          <q-chip
            v-if="observation.sharedState.currentObservation.mode"
            dense
            size="sm"
            :label="methods.formatMode(observation.sharedState.currentObservation.mode)"
            :color="observation.sharedState.currentObservation.mode === 'chronometer' ? 'blue-2' : 'orange-2'"
            :text-color="observation.sharedState.currentObservation.mode === 'chronometer' ? 'blue-9' : 'orange-9'"
          />
        </div>
        <div class="row q-gutter-sm q-mt-md">
          <q-btn
            v-for="step in navSteps"
            :key="step.key"
            :icon="step.icon"
            :label="step.btnLabel"
            class="col cta-btn"
            outline
            color="accent"
            no-caps
            :disable="step.disabled"
            @click="chronicleNav.navigateTo(step)"
          >
            <q-tooltip v-if="step.tooltip">{{ step.tooltip }}</q-tooltip>
          </q-btn>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { useChronicleNavigation } from 'src/composables/use-chronicle-navigation';
import { ProtocolItemTypeEnum } from '@services/observations/interface';
import { relativeDay } from '@lib-improba/utils/date-format.utils';

export default defineComponent({
  name: 'ActiveChronicle',
  setup() {
    const observation = useObservation();
    const chronicleNav = useChronicleNavigation();
    const { t, locale } = useI18n();

    const readingsCount = computed(() => {
      return observation.readings.sharedState.currentReadings.length;
    });

    const categoriesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) return 0;
      return protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Category,
      ).length;
    });

    const observablesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) return 0;
      let count = protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Observable,
      ).length;
      protocol._items.forEach((item: any) => {
        if (item.type === ProtocolItemTypeEnum.Category && item.children) {
          count += item.children.filter(
            (child: any) => child.type === ProtocolItemTypeEnum.Observable,
          ).length;
        }
      });
      return count;
    });

    const navSteps = computed(() => {
      void locale.value;
      const btnLabels: Record<string, string> = {
        protocol: t('chronicle.ctaProtocol'),
        observation: t('chronicle.ctaObservation'),
        graph: t('chronicle.ctaGraph'),
        statistics: t('chronicle.ctaStatistics'),
      };
      return chronicleNav.steps.value.map(step => ({
        ...step,
        btnLabel: btnLabels[step.key] ?? step.label,
      }));
    });

    const methods = {
      formatMode(mode: string | null | undefined): string {
        void locale.value;
        if (mode === 'chronometer') return t('activeChronicle.modeChronometer');
        if (mode === 'calendar') return t('activeChronicle.modeCalendar');
        return '';
      },

      formatRelativeDate(dateString: string | Date | undefined): string {
        if (!dateString) return '';
        return relativeDay(typeof dateString === 'string' ? dateString : dateString.toISOString());
      },
    };

    return {
      observation,
      chronicleNav,
      readingsCount,
      categoriesCount,
      observablesCount,
      navSteps,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.active-chronicle {
  .chronicle-header {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.08) 0%, rgba(31, 41, 55, 0.05) 100%);
    border-left: 4px solid var(--primary);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .cta-btn {
    background: #fff;
    border-radius: 0.5rem;
    font-weight: 500;
  }
}
</style>
