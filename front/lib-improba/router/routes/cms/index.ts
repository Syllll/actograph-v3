import { RouteRecordRaw } from 'vue-router';

const meta = { auth: true, access: ['admin'] };

export const cmsRoutes: RouteRecordRaw[] = [
  {
    path: 'cms',
    name: 'cms',
    meta,
    redirect: { name: 'cms_admin_pages' },
    component: () => import('src/../lib-improba/pages/cms/Index.vue'),
    children: [
      {
        path: 'admin',
        name: 'cms_admin',
        meta,
        component: () => import('src/../lib-improba/pages/cms/admin/Index.vue'),
        children: [
          {
            path: 'pages',
            name: 'cms_admin_pages',
            meta,
            component: () =>
              import('src/../lib-improba/pages/cms/admin/pages/Index.vue'),
            children: [
              {
                path: 'view/:id',
                name: 'cms_admin_pages_view',
                props: true,
                meta,
                component: () =>
                  import(
                    'src/../lib-improba/pages/cms/admin/pages/view/Index.vue'
                  ),
              },
            ],
          },
          {
            path: 'blocs',
            name: 'cms_admin_blocs',
            meta,
            component: () =>
              import('src/../lib-improba/pages/cms/admin/blocs/Index.vue'),
            children: [
              {
                path: 'view',
                name: 'cms_admin_blocs_view',
                meta,
                component: () =>
                  import(
                    'src/../lib-improba/pages/cms/admin/blocs/view/Index.vue'
                  ),
              },
            ],
          },
        ],
      },
      {
        path: 'editor',
        name: 'cms_editor',
        meta,
        component: () =>
          import('src/../lib-improba/pages/cms/editor/Index.vue'),
        children: [
          {
            path: 'page/:pageUrl',
            name: 'cms_editor_page',
            meta,
            props: true,
            component: () =>
              import('src/../lib-improba/pages/cms/editor/page/Index.vue'),
          },
          {
            path: 'bloc/:blocId',
            name: 'cms_editor_bloc',
            meta,
            props: true,
            component: () =>
              import('src/../lib-improba/pages/cms/editor/bloc/Index.vue'),
          },
        ],
      },
      {
        path: 'viewer/:pageUrl',
        name: 'cms_viewer',
        meta,
        props: true,
        component: () =>
          import('src/../lib-improba/pages/cms/viewer/Index.vue'),
        children: [],
      }
    ],
  },
  {
    path: 'cms-iframe/:myTreeId',
    name: 'iframe',
    props: true,
    component: () => import('src/../lib-improba/pages/cms/iframe/Index.vue'),
    children: []
  }
];
