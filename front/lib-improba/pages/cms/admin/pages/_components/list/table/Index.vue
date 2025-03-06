<template>
  <DPaginationTable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    v-model:triggerReload="state.reload"
  >
    <template v-slot:table-col-actions="scope">
      <div class="row gutter-sm items-center justify-start">
        <DActionViewBtn
          tooltip="Voir la fiche"
          @click="
            $router.push({
              name: 'cms_admin_pages_view',
              params: {
                id: scope.row.id,
              },
              query: {
                previousUrl: $route.fullPath,
              },
            })
          "
        />
        <DActionBtn
          icon="construction"
          @click="methods.goToBlocEditor(scope.row)"
          tooltip="Editer avec le page builder"
        />
        <DActionRemoveBtn @click="methods.remove(scope.row)" />
      </div>
    </template>
  </DPaginationTable>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { columns } from './columns';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { IPage } from '@lib-improba/services/cms/interface';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { notify } from '@lib-improba/utils/notify.utils';

export default defineComponent({
  components: {},
  props: {
    searchText: {
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
      remove: async (row: IPage) => {
        const dialogResp = await createDialog({
          title: 'Suppression',
          message: 'Voulez-vous vraiment supprimer cette page ?',
          cancel: true,
        });
        if (!dialogResp) return;

        try {
          const response = await adminPageService.remove({ id: row.id });
          await notify({
            message: 'La page a bien été supprimée',
            color: 'success-medium',
          });
          state.reload = true;
        } catch (err) {
          console.error(err);
        }
      },
      goToBlocEditor: (row: IPage) => {
        router.push({
          name: 'cms_editor_page',
          params: { pageUrl: row.url },
          query: {
            editableBlocId: row.content?.id,
            previousUrl: router.currentRoute.value.fullPath,
          },
        });
      },
      fetch: async (
        limit: number,
        offset: number,
        orderBy = 'id',
        order = 'DESC',
        includes = ['layout', 'content']
      ): Promise<any> => {
        let searchString = props.searchText;
        if (searchString && !searchString.endsWith('*')) {
          searchString += '*';
        }

        const response = await adminPageService.findWithPagination(
          {
            limit,
            offset,
            orderBy,
            order,
            includes,
          },
          {
            searchString,
          }
        );

        return response;
      },
    };

    watch(
      () => props.searchText,
      () => {
        methods.reload();
      }
    );

    return { stateless, state, router, methods };
  },
});
</script>
