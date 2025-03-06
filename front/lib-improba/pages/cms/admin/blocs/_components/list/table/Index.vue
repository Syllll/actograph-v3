<template>
  <DPaginationTable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    v-model:triggerReload="state.reload"
  >
    <template v-slot:table-col-actions="scope">
      <div class="row gutter-sm items-center justify-start">
        <DActionViewBtn disable tooltip="Voir la fiche" />
        <DActionBtn
          icon="construction"
          @click="methods.goToBlocEditor(scope.row)"
          tooltip="Editer avec le page builder"
        />
      </div>
    </template>
  </DPaginationTable>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { columns } from './columns';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';
import { IPage } from '@lib-improba/services/cms/interface';

export default defineComponent({
  components: {},
  props: {
    searchText: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    const router = useRouter();
    const stateless = {
      columns,
    };
    const state = reactive({
      reload: false,
    });

    const methods = {
      reload: () => {
        state.reload = true;
      },
      goToBlocEditor: (row: IPage) => {
        router.push({
          name: 'cms_editor_bloc',
          params: {
            blocId: row.id,
          },
          query: {
            previousUrl: router.currentRoute.value.fullPath,
          },
        });
      },
      fetch: async (
        limit: number,
        offset: number,
        orderBy = 'id',
        order = 'DESC',
        includes = []
      ): Promise<any> => {
        let searchString = props.searchText;
        if (searchString && !searchString.endsWith('*')) {
          searchString += '*';
        }

        let type = undefined as undefined | string;
        if (props.type) {
          type = props.type;
        }

        const response = await adminBlocService.findWithPagination(
          {
            limit,
            offset,
            orderBy,
            order,
            includes,
          },
          {
            searchString,
            type,
          }
        );

        return response;
      },
    };

    watch(
      () => [props.searchText, props.type],
      () => {
        methods.reload();
      }
    );

    return { stateless, state, router, methods };
  },
});
</script>
