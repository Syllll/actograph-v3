import { RouteRecordRaw } from 'vue-router';

const meta = { auth: true, access: ['user', 'admin'] };

export const userRoutes: RouteRecordRaw[] = [
  {
    path: 'userspace',
    name: 'user',
    meta,
    component: () => import('src/pages/userspace/Index.vue'),
    redirect: {name: 'user_home'},
    children: [
      {   
        path: 'home',
        name: 'user_home',
        component: () => import('pages/userspace/home/Index.vue'),
      },
      {
        path: 'protocol',
        name: 'user_protocol',
        component: () => import('pages/userspace/protocol/Index.vue'),
      },
      {
        path: 'observation',
        name: 'user_observation',
        component: () => import('pages/userspace/observation/Index.vue'),
      },
      {
        path: 'analyse',
        name: 'user_analyse',
        component: () => import('pages/userspace/analyse/Index.vue'),
      },
    ],
  },
];
