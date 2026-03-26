import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';

export interface ChronicleNavStep {
  key: string;
  label: string;
  icon: string;
  route: { name: string };
  isActive: () => boolean;
  disabled: boolean;
  tooltip: string;
}

/**
 * Single source of truth for the chronicle workflow navigation steps.
 *
 * Used by both the drawer side-menu and the ActiveChronicle card
 * so the routes, disabled states and tooltips are always consistent.
 */
export const useChronicleNavigation = () => {
  const router = useRouter();
  const observation = useObservation();
  const { t, locale } = useI18n();

  const hasObservation = computed(
    () => !!observation.sharedState.currentObservation,
  );

  const hasReadings = computed(
    () => observation.readings.sharedState.currentReadings.length > 0,
  );

  const steps = computed<ChronicleNavStep[]>(() => {
    void locale.value;
    const noChronicle = t('chronicle.tooltipNoChronicle');
    const noReadings = t('chronicle.tooltipNoReadings');
    return [
      {
        key: 'protocol',
        label: t('chronicle.navProtocol'),
        icon: 'mdi-flask-outline',
        route: { name: 'user_protocol' },
        isActive: () => router.currentRoute.value.name === 'user_protocol',
        disabled: !hasObservation.value,
        tooltip: !hasObservation.value ? noChronicle : '',
      },
      {
        key: 'observation',
        label: t('chronicle.navObservation'),
        icon: 'mdi-binoculars',
        route: { name: 'user_observation' },
        isActive: () => router.currentRoute.value.name === 'user_observation',
        disabled: !hasObservation.value,
        tooltip: !hasObservation.value ? noChronicle : '',
      },
      {
        key: 'graph',
        label: t('chronicle.navGraph'),
        icon: 'mdi-chart-line',
        route: { name: 'user_analyse' },
        isActive: () => router.currentRoute.value.name === 'user_analyse',
        disabled: !hasObservation.value || !hasReadings.value,
        tooltip: !hasObservation.value
          ? noChronicle
          : !hasReadings.value
            ? noReadings
            : '',
      },
      {
        key: 'statistics',
        label: t('chronicle.navStatistics'),
        icon: 'mdi-chart-box',
        route: { name: 'user_statistics' },
        isActive: () => router.currentRoute.value.name === 'user_statistics',
        disabled: !hasObservation.value || !hasReadings.value,
        tooltip: !hasObservation.value
          ? noChronicle
          : !hasReadings.value
            ? noReadings
            : '',
      },
    ];
  });

  const navigateTo = (step: ChronicleNavStep) => {
    if (!step.disabled) {
      router.push(step.route);
    }
  };

  return {
    steps,
    hasObservation,
    hasReadings,
    navigateTo,
  };
};
