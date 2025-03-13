<template>
  <Layout class="fit">
    <Tree
      v-if="iframe.sharedState.ready && iframe.treeState.pageBuilderJson"
      :myTreeId="$props.myTreeId"
      :builderVars="iframe.state.builderVars"
      :builderStyle="iframe.state.builderStyle"
      :readonly="iframe.treeState.readonly"
    />
    <div v-else class="fit flex flex-center">
      <q-spinner color="primary" size="3em" />
    </div>
  </Layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Layout from '@lib-improba/components/layouts/empty/Index.vue';
import { PageBuilderEditor } from '@lib-improba/components/page-builder';
import { Tree } from '@lib-improba/components/page-builder/lib/tree';

import { useIFrame } from '@lib-improba/components/page-builder/lib/ui/use-iframe/index';

export default defineComponent({
  components: {
    Layout,
    PageBuilderEditor,
    Tree,
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
  },
  setup(props, context) {
    const iframe = useIFrame(props.myTreeId, { iframe: true });

    const methods = {};

    return {
      iframe,
      props,
      methods,
    };
  },
});
</script>
