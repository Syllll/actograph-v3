<template>
  <div class="q-my-md row q-gutter-x-md">
    <DSearchInput v-model="state.search" style="width: 20rem" />
    <UserRoleSelect v-model="state.userRoleFilter" />
    <DSpace />
    <DSubmitBtn label="Add a user" @click="state.triggerOpenModal = true">
      <AddUserModal
        v-model:triggerOpen="state.triggerOpenModal"
        @refresh="state.reload = true"
      />
    </DSubmitBtn>
  </div>
  <DPaginationTable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    v-model:triggerReload="state.reload"
  >
    <template v-slot:table-col-actions="">
      <div class="row gutter-sm items-center justify-center">
        <!--<DActionViewBtn
          @click="
            router.push({
              name: 'admin_user_view',
              params: { viewId: scope.row.id },
            })
          "
        />-->
        -Actions-
      </div>
    </template>
    <!-- <template v-slot:expanded-row="scope">
      <p>Extended</p>
    </template> -->
  </DPaginationTable>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { columns } from './columns';
import { adminUserService } from '@services/users/admin/admin-user.service';
import AddUserModal from './add-user-modal/Index.vue';
import UserRoleSelect from './UserRoleSelect.vue';

export default defineComponent({
  components: {
    AddUserModal,
    UserRoleSelect,
  },
  setup() {
    const router = useRouter();

    const stateless = {
      columns,
    };

    const state = reactive({
      loading: false,
      reload: false,
      search: '',
      userRoleFilter: null,
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
        let searchString = state.search;
        if (!searchString.endsWith('*')) {
          searchString += '*';
        }

        const filterRoles = [] as string[];
        if (state.userRoleFilter) {
          filterRoles.push(state.userRoleFilter);
        }

        const response = await adminUserService.findWithPagination(
          {
            limit,
            offset,
            orderBy,
            order,
            includes,
          },
          {
            searchString,
            filterRoles,
          }
        );

        return response;
      },
      async removeUser(id: number) {
        /*const response = await adminUserService.remove(id)
        state.reload = true
        return response*/
      },
    };

    /* onMounted(async () => {
      state.loading = true
      await methods.init()
      state.loading = false
    }) */

    watch(
      () => state.search,
      () => {
        state.reload = true;
      }
    );

    watch(
      () => state.userRoleFilter,
      () => {
        state.reload = true;
      }
    );

    return {
      stateless,
      state,
      methods,
      router,
    };
  },
});
</script>
