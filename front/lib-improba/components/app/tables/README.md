# Table of content

1. [DPaginationTable](#markdown-header-dpaginationtable)
   1. [Simple use](#markdown-header-simple-use)
   2. [Advanced use](#markdown-header-advanced-use)
   3. [Developer](#markdown-header-developer)
2. [DTable](#markdown-header-dtable)

# DPaginationTable

DPaginationTable is a complex component that is meant work "out of the box" with the pagination mecanism of the nestjs template. It provides the developer with a paginated table that can be heavily customized.

## Simple use

The component is designed to be easy to use (but not easy to dvelve into) so here a simple example of how to use it in a basic context. It includes:

- **fetchFunction** that is used to get the data, the function must be implemented in the component with specific arguments
- **columns** is a list that represents the columns of the table.
- **v-model:triggerReload** is a reactive boolean that can be used to trigger manuelly a reload.

```html
<template>
  <DPaginationTable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    v-model:triggerReload="state.reload"
  >
    <!--
     Customize the column "username" using the slot table-col-nameOfTheCol
  -->
    <!--
    <template v-slot:table-col-username="scope">
      <div class="row gutter-sm items-center justify-center">
        Custom: {{scope.row.id}} - {{scope.col.value}}
      </div>
    </template>
    -->
  </DPaginationTable>
</template>

<script lang="ts">
  import { defineComponent, reactive, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { columns } from './columns';
  import { adminUserService } from 'src/../lib-improba/services/users/admin/admin-user.service';

  export default defineComponent({
    components: {},
    setup() {
      const router = useRouter();

      const stateless = {
        columns,
      };

      const state = reactive({
        loading: false,
        reload: false,

        triggerOpenModal: false,
      });

      const methods = {
        async fetch(
          limit: number,
          offset: number,
          orderBy = 'id',
          order = 'DESC',
          includes = ['userJwt']
        ): Promise<any> {
          const response = await adminUserService.findWithPagination({
            limit,
            offset,
            orderBy,
            order,
            includes,
          });

          return response;
        },
      };

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

The columns variable is defined in a specific typescript file located next to the .vue file in which the pagination table is used:

```typescript
import { date as qDate } from 'quasar';
import { useI18n } from 'vue-i18n';
import { IUser } from 'src/../lib-improba/services/users/user.interface';
import { relativeDay } from 'src/../lib-improba/utils/date-format.utils';

export const columns = [
  {
    name: 'id',
    align: 'left',
    label: 'Id',
    sortable: true,
    field: (row: IUser) => row.id,
    format: (val: any) => val,
  },
  {
    name: 'username',
    align: 'left',
    label: 'Email',
    sortable: true,
    field: (row: IUser) => row.userJwt?.username,
    format: (val: any) => val,
  },
  {
    name: 'createDate',
    align: 'left',
    label: 'Create date',
    sortable: true,
    field: (row: IUser) => row.createdAt,
    format: (val: string) => relativeDay(val),
  },
];
```

You may want to add other features:

- **Expand feature** to expand a line

```html
<template>
  <DPaginationTable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    v-model:triggerReload="state.reload"
    :expandable="true"
  >
    <!--
     Customize the column "username" using the slot table-col-nameOfTheCol
  -->
    <template v-slot:expanded-row="scope">
      <p>Extended line with id: {{scope.row.id}}</p>
    </template>
  </DPaginationTable>
</template>
```

- **Select feature** to select lines. Selection can be "single" or "multiple". The result is injected in the selected reactive variable.

```html
<DPaginationTable
  :columns="stateless.columns"
  :fetchFunction="methods.fetch"
  v-model:triggerReload="state.reload"
  selection="single"
  v-model:selected="state.selected"
>
</DPaginationTable>
```

- **Use url query params** to save the table state.

```html
<DPaginationTable
  :columns="stateless.columns"
  :fetchFunction="methods.fetch"
  v-model:triggerReload="state.reload"
  useUrl
  tableUrlId="table-id"
>
</DPaginationTable>
```

## Advanced use

It is possible to edit the header, footer and css styles to apply to cells.
To be continued.

## Developer

Look at the example: /docs/table/advanced

# DTable

Similar to the PaginationTable but with a simple arraw of rows.
Look at the example: /docs/table/simple
