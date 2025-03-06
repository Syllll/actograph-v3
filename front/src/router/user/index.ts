import { RouteRecordRaw } from 'vue-router';

const meta = { auth: true, access: ['user', 'admin'] };

export const userRoutes: RouteRecordRaw[] = [
  {
    path: 'userspace',
    name: 'user',
    meta,
    component: () => import('src/pages/userspace/Index.vue'),
    /*redirect: {name: 'user_projects'},
    children: [
      {
        path: 'projects',
        name: 'user_projects',
        component: () => import('pages/user/projects/Index.vue'),
      },
    ],*/
  },
];
