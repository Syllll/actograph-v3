import { RouteRecordRaw } from 'vue-router';

const meta = { auth: false };

export const docsRoutes: RouteRecordRaw[] = [
  {
    path: 'docs',
    name: 'docs',
    meta,
    component: () => import('src/../lib-improba/pages/docs/Index.vue'),
    // redirect: { name: 'docs_tabview' },
    children: [
      {
        path: 'button',
        name: 'docs_button',
        redirect: { name: 'docs_button_simple' },
        component: () =>
          import('src/../lib-improba/pages/docs/button/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_button_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/button/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_button_advanced',
            component: () =>
              import('src/../lib-improba/pages/docs/button/advanced/Index.vue'),
          },
        ],
      },
      {
        path: 'tabview',
        name: 'docs_tabview',
        redirect: { name: 'docs_tabview_simple' },
        component: () =>
          import('src/../lib-improba/pages/docs/tabview/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_tabview_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/tabview/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_tabview_advanced',
            component: () =>
              import(
                'src/../lib-improba/pages/docs/tabview/advanced/Index.vue'
              ),
          },
        ],
      },
      {
        path: 'card',
        name: 'docs_card',
        redirect: { name: 'docs_card_simple' },
        component: () => import('src/../lib-improba/pages/docs/card/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_card_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/card/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_card_advanced',
            component: () =>
              import('src/../lib-improba/pages/docs/card/advanced/Index.vue'),
          },
        ],
      },
      {
        path: 'table',
        name: 'docs_table',
        redirect: { name: 'docs_table_simple' },
        component: () =>
          import('src/../lib-improba/pages/docs/table/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_table_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/table/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_table_advanced',
            component: () =>
              import('src/../lib-improba/pages/docs/table/advanced/Index.vue'),
          },
        ],
      },
      {
        path: 'modal',
        name: 'docs_modal',
        redirect: { name: 'docs_modal_simple' },
        component: () =>
          import('src/../lib-improba/pages/docs/modal/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_modal_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/modal/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_modal_advanced',
            component: () =>
              import('src/../lib-improba/pages/docs/modal/advanced/Index.vue'),
          },
        ],
      },
      {
        path: 'chip',
        name: 'docs_chip',
        redirect: { name: 'docs_chip_simple' },
        component: () => import('src/../lib-improba/pages/docs/chip/Index.vue'),
        children: [
          {
            path: 'simple',
            name: 'docs_chip_simple',
            component: () =>
              import('src/../lib-improba/pages/docs/chip/simple/Index.vue'),
          },
          {
            path: 'advanced',
            name: 'docs_chip_advanced',
            component: () =>
              import('src/../lib-improba/pages/docs/chip/advanced/Index.vue'),
          },
        ],
      },
    ],
  },
];
