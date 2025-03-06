<template>
  <DView
    v-if="state.page"
    extendedHeader
    :title="state.page.name"
    :backBtnName="'Retour'"
    :backBtnRoute="$router.currentRoute.value.query.previousUrl"
    :beforeNavigate="methods.confirmBackAction"
  >
    <template v-slot:actions>
      <DBtn
        icon="construction"
        label="Editer la page"
        @click="
          $router.push({
            name: 'cms_editor_page',
            params: {
              pageUrl: state.page.url,
            },
            query: {
              editableBlocId: state.page.content?.id,
            },
          })
        "
      />
      <DBtn
        color="accent-medium"
        icon="visibility"
        label="Voir la page"
        @click="
          $router.push({
            name: 'cms_viewer',
            params: {
              pageUrl: state.page.url,
            },
          })
        "
      />
    </template>

    <GeneralCard
      :page="state.page"
      @edited="state.edited['general'] = $event"
      @refresh="methods.init"
    />
  </DView>
</template>

<script lang="ts">
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';
import { IBloc, IPage } from '@lib-improba/services/cms/interface';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { QDialogOptions } from 'quasar';
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import GeneralCard from './GeneralCard.vue';

export default defineComponent({
  components: {
    GeneralCard,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();

    const stateless = {};
    const state = reactive({
      edited: {
        general: false,
      } as { [key: string]: boolean },
      page: null as null | IPage,
    });

    const methods = {
      init: async () => {
        const idNumber = parseInt(props.id);
        const page = await adminPageService.findOne(idNumber, {
          relations: ['layout', 'content'],
        });
        state.page = page;
      },

      confirmBackAction: async () => {
        if (!Object.values(state.edited).some((v) => v)) {
          return true;
        }

        const dr = await createDialog({
          title: 'Confirmation',
          message:
            'Voulez-vous vraiment quitter cette page ? Des modifications non sauvegardées existent.',
          ok: 'Oui',
          cancel: 'Non',
        });
        return dr;
      },
    };

    onMounted(async () => {
      await methods.init();
    });

    return { stateless, state, router, methods };
  },
});
</script>
