import { RouteRecordRaw } from 'vue-router';

const meta = { auth: true, access: ['admin'] };

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: 'adminspace',
    name: 'admin',
    meta,
    redirect: { name: 'admin_users' },
    component: () => import('@pages/adminspace/Index.vue'),
    children: [
      {
        path: 'users',
        name: 'admin_users',
        meta,
        component: () =>
          import('@pages/adminspace/users/Index.vue'),
        redirect: { name: 'admin_users_list' },
        children: [
          {
            path: 'list',
            name: 'admin_users_list',
            meta,
            component: () =>
              import('@pages/adminspace/users/list/Index.vue'),
          },
        ],
      },
    ],
  },
];
