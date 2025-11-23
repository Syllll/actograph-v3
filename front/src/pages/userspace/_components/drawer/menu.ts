import { Router } from 'vue-router';

export const menu = (router: Router) => [
  {
    label: 'Accueil',
    icon: 'home',
    separator: false,
    action: () => router.push({ name: 'user_home' }),
    isActive: () => router.currentRoute.value.name === 'user_home',
  },
  {
    label: 'Protocole',
    icon: 'mdi-flask-outline',
    separator: false,
    action: () => router.push({ name: 'user_protocol' }),
    isActive: () => router.currentRoute.value.name === 'user_protocol',
    disabled: (observation: any) => !observation.sharedState.currentObservation,
  },
  {
    label: 'Observation',
    icon: 'mdi-binoculars',
    separator: false,
    action: () => router.push({ name: 'user_observation' }),
    isActive: () => router.currentRoute.value.name === 'user_observation',
    disabled: (observation: any) => !observation.sharedState.currentObservation,
  },
  {
    label: 'Graphe',
    icon: 'mdi-chart-line',
    separator: false,
    action: () => router.push({ name: 'user_analyse' }),
    isActive: () => router.currentRoute.value.name === 'user_analyse',
    disabled: (observation: any) => {
      return !observation.sharedState.currentObservation || 
             observation.readings.sharedState.currentReadings.length === 0;
    },
    tooltip: (observation: any) => {
      if (!observation.sharedState.currentObservation) {
        return 'Aucune chronique chargée';
      }
      if (observation.readings.sharedState.currentReadings.length === 0) {
        return 'Aucun relevé disponible. Veuillez d\'abord enregistrer des observations.';
      }
      return '';
    },
  },
  {
    label: 'Statistiques',
    icon: 'mdi-chart-box',
    separator: false,
    action: () => router.push({ name: 'user_statistics' }),
    isActive: () => router.currentRoute.value.name === 'user_statistics',
    disabled: (observation: any) => {
      return !observation.sharedState.currentObservation || 
             observation.readings.sharedState.currentReadings.length === 0;
    },
    tooltip: (observation: any) => {
      if (!observation.sharedState.currentObservation) {
        return 'Aucune chronique chargée';
      }
      if (observation.readings.sharedState.currentReadings.length === 0) {
        return 'Aucun relevé disponible. Veuillez d\'abord enregistrer des observations.';
      }
      return '';
    },
  },
];
