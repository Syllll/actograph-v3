import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@pages/Index.vue'),
      },
      {
        path: 'observation',
        name: 'observation',
        component: () => import('@pages/observation/Index.vue'),
      },
      {
        path: 'readings',
        name: 'readings',
        component: () => import('@pages/readings/Index.vue'),
      },
      {
        path: 'graph',
        name: 'graph',
        component: () => import('@pages/graph/Index.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@pages/settings/Index.vue'),
      },
    ],
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue'),
  },
];

export default routes;
