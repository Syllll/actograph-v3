# Table of content

1. [DTree](#markdown-header-dpaginationtable)
   1. [Simple use](#markdown-header-simple-use)
   2. [Advanced use](#markdown-header-advanced-use)
   3. [Developer](#markdown-header-developer)

# DTree

DTree is a simpe wrapper around the quasar q-tree component.

## Simple use

```html
<template>
  <DTree
    :nodes="stateless.tree"
    node-key="name"
    default-expand-all
    tick-strategy="leaf"
    v-model:ticked="state.tickedKeys"
  >
  </DTree>
</template>

<script lang="ts">
  import { defineComponent, reactive, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { tree } from './tree';
  import { adminUserService } from 'src/../lib-improba/services/users/admin/admin-user.service';

  export default defineComponent({
    components: {},
    setup() {
      const router = useRouter();

      const stateless = {
        tree,
      };

      const state = reactive({
        tickedKeys: [] as string[],
      });

      const methods = {};

      return {
        stateless,
        state,
        methods,
        router,
      };
    },
  });
</script>
```

The tree variable is defined in a specific typescript file located next to the .vue file in which the pagination table is used:

```typescript
export const tree = [
  {
    name: 'n1',
    label: 'Node 1',
    children: [
      {
        name: 'n1.1',
        label: 'Node 1.1',
        children: [
          {
            name: 'n1.1.1',
            label: 'Node 1.1.1',
          },
          {
            name: 'n1.1.2',
            label: 'Node 1.1.2',
          },
        ],
      },
      {
        name: 'n1.2',
        label: 'Node 1.2',
      },
    ],
  },
  {
    name: 'n2',
    label: 'Node 2',
    children: [],
  },
];
```

## Advanced use

```html
<DTree
  :nodes="stateless.tree"
  node-key="name"
  default-expand-all
  tick-strategy="leaf"
  v-model:ticked="state.tickedKeys"
>
  <template v-slot:default-header="{ scope }">
    titi {{scope.node.label}}
  </template>
</DTree>
```

## Developer

To be completed.
