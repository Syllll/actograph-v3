<template>
  <PageBuilderEditor
    v-if="state.pageJson"
    :builderVars="state.builderVars"
    :builderStyle="{ colors: {} }"
    v-model="state.pageJson"
    :blocId="state.blocId"
  />
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PageBuilderEditor } from '@lib-improba/components/page-builder';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';

export default defineComponent({
  components: {
    PageBuilderEditor,
  },
  props: {
    pageUrl: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();
    const stateless = {
      menuItems: [],
    };
    const state = reactive({
      hasLayout: false as boolean,
      blocId: undefined as undefined | number,
      builderVars: {} as any,
      pageJson: null as null | any,
    });

    onMounted(async () => {
      const page = await adminPageService.findWithContentAndLayout({
        pageUrl: props.pageUrl,
      });

      const hasLayout = page.layout?.content;
      if (hasLayout) {
        state.blocId = page.layout?.id;
        state.pageJson = page.layout?.content;
      } else {
        state.blocId = page.content?.id;
        state.pageJson = page.content?.content;
      }

      const editableBlocIdFromQuery =
        router.currentRoute.value.query.editableBlocId;
      let editableBlocId = undefined as undefined | number;
      if (editableBlocIdFromQuery) {
        editableBlocId = parseInt(editableBlocIdFromQuery.toString());
      } else {
        editableBlocId = page.content?.id;
      }

      state.builderVars = {
        _PAGE_NAME: page.name,
        _PAGE_ID: page.id,
        _PAGE_URL: page.url,
        _PAGE_CONTENT_BLOC_ID: page.content?.id,
        _PAGE_LAYOUT_BLOC_ID: page.layout?.id,

        _EDITABLE_BLOC_ID: editableBlocId,
      };
    });

    return { stateless, state };
  },
});
</script>
