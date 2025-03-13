import { RouteRecordRaw } from 'vue-router';
import { userRoutes } from '@router/user';
import { adminRoutes } from '@router/admin';
import { authRoutes } from '@router/auth';
import { docsRoutes } from '@lib-improba/router/routes/docs';
import { cmsRoutes } from '@lib-improba/router/routes/cms';
import { bofRoutes } from '@lib-improba/router/routes/buildoform';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'root',
    component: () => import('pages/Index.vue'),
    children: [
      { path: 'home', name: 'home', component: () => import('pages/Home.vue') },
      ...adminRoutes,
      ...userRoutes,
      ...authRoutes,
      ...docsRoutes,
      ...cmsRoutes,
      ...bofRoutes,
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
