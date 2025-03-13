import { RouteRecordRaw } from 'vue-router';

const meta = { auth: false };

export const authRoutes: RouteRecordRaw[] = [
  {
    path: 'page-builder',
    name: 'page-builder',
    component: () => import('src/../lib-improba/page-builder/Index.vue'),
    children: [
      {
        path: 'viewer',
        name: 'page-builder_viewer',
        component: () =>
          import('src/../lib-improba/page-builder/viewer/Index.vue'),
      },
      {
        path: 'editor',
        name: 'page-builder_editor',
        component: () =>
          import('src/../lib-improba/page-builder/editor/Index.vue'),
      },
    ],
  },
];
