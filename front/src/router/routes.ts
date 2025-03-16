import { RouteRecordRaw } from 'vue-router';
import { userRoutes } from '@router/user';
import { adminRoutes } from '@router/admin';
import { authRoutes } from '@router/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'root',
    component: () => import('pages/Index.vue'),
    children: [
      { path: 'home', name: 'home', component: () => import('pages/Home.vue') },
      {
        path: 'gateway',
        name: 'gateway',
        component: () => import('pages/gateway/Index.vue'),
        redirect: { name: 'gateway_loading' },
        children: [
          {
            path: 'loading',
            name: 'gateway_loading',
            component: () => import('pages/gateway/Loading.vue'),
          },
          {
            path: 'choose-version',
            name: 'gateway_choose-version',
            component: () => import('pages/gateway/ChooseVersion.vue'),
          },
          {
            path: 'activate-pro',
            name: 'gateway_activate-pro',
            component: () => import('pages/gateway/ActivatePro.vue'),
          },
        ],
      },
      ...adminRoutes,
      ...userRoutes,
      ...authRoutes,
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
