import { RouteRecordRaw } from 'vue-router';

export const bofRoutes: RouteRecordRaw[] = [
  {
    path: 'bof',
    name: 'bof',
    component: () => import('src/../lib-improba/pages/buildoform/Index.vue'),
  },
];
