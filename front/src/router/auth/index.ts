import { RouteRecordRaw } from 'vue-router';

const meta = { auth: false };

export const authRoutes: RouteRecordRaw[] = [
  {
    path: 'auth',
    name: 'auth',
    meta,
    component: () => import('src/pages/auth/Index.vue'),
    redirect: { name: 'auth_login' },
    children: [
      {
        path: 'login',
        name: 'auth_login',
        props: true,
        meta,
        component: () =>
          import('src/pages/auth/login/Index.vue'),
      },
      {
        path: 'register',
        name: 'auth_register',
        props: true,
        meta,
        component: () =>
          import('src/pages/auth/register/Index.vue'),
      },
      {
        path: 'resetPwd',
        name: 'auth_resetPwd',
        props: true,
        meta,
        component: () =>
          import('src/pages/auth/resetPassword/Index.vue'),
      },
    ],
  },
];
