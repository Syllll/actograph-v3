<template>
  <Layout>
    <PageBuilderViewer
      v-if="state.json"
      :builderVars="state.builderVars"
      :builderStyle="{ colors: { primary: '#ff0000' } }"
      v-model="state.json"
      :blocId="state.blocId"
    />
  </Layout>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import Layout from '@lib-improba/components/layouts/empty/Index.vue';
import { PageBuilderViewer } from '@lib-improba/components/page-builder';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';

export default defineComponent({
  components: { Layout, PageBuilderViewer },
  props: {
    pageUrl: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const stateless = {
      menuItems: [],
    };
    const state = reactive({
      builderVars: {} as any,
      blocId: undefined as undefined | number,
      json: null as null | any,
    });

    onMounted(async () => {
      const page = await adminPageService.findWithContentAndLayout({
        pageUrl: props.pageUrl,
      });

      const hasLayout = page.layout?.content;
      if (hasLayout) {
        state.blocId = page.layout?.id;
        state.json = page.layout?.content;
      } else {
        state.blocId = page.content?.id;
        state.json = page.content?.content;
      }

      state.builderVars = {
        _PAGE_NAME: page.name,
        _PAGE_ID: page.id,
        _PAGE_URL: page.url,
        _PAGE_CONTENT_BLOC_ID: page.content?.id,
        _PAGE_LAYOUT_BLOC_ID: page.layout?.id,
      };
    });

    return { stateless, state };
  },
});
</script>
