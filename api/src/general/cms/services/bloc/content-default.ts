export const pageContentDefault = {
  _maxId: 1,
  id: 0,
  name: 'Column',
  slot: 'default',
  props: {},
  children: [
    {
      id: 1,
      name: 'Text',
      slot: 'default',
      props: {
        text: 'Bonjour, je suis la page {{ _PAGE_NAME }}',
      },
      children: [],
    },
  ],
};

export const layoutContentDefault = {
  _maxId: 3,
  id: 0,
  name: 'Container',
  slot: null,
  props: {},
  children: [
    {
      id: 1,
      name: 'PageWithBackground',
      slot: 'default',
      props: {},
      children: [
        {
          id: 2,
          name: 'Column',
          slot: 'default',
          props: {},
          children: [
            {
              id: 3,
              name: 'LayoutPageContent',
              slot: 'default',
              props: {},
              children: [],
            },
          ],
        },
      ],
    },
  ]
};

export const blocContentDefault = {
  _maxId: 0,
  id: 0,
  name: 'Container',
  slot: null,
  props: {},
  children: [
  ]
}
