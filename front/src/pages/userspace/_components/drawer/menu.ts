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
    label: 'Analyse',
    icon: 'mdi-chart-line',
    separator: false,
    action: () => router.push({ name: 'user_analyse' }),
    isActive: () => router.currentRoute.value.name === 'user_analyse',
    disabled: (observation: any) => !observation.sharedState.currentObservation,
  },
];
