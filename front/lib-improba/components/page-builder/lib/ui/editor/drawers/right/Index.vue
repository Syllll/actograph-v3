<template>
  <PBDrawer
    :myTreeId="props.myTreeId"
    type="right"
  >
    <div class="fit column">

      <!-- ? COPIED NODE -->
      <div v-if="!!treeState.copiedNode" class="q-mb-md">
        <div class="text-pb-editor-text text-h4">Noeud Copié</div>
        <PBNode
          readonly
          class="clickable"
          :my-tree-id="props.myTreeId"
          :node="{...treeState.copiedNode, readonly: true, copied: true }"
          :selected-node-key="computedState.selectedNodeKey.value || undefined"
          @click="treeState.selected = treeState.copiedNode"
        />
      </div>

      <!-- ? NAVIGATION -->
      <div class="col-auto text-pb-editor-text text-h4">Navigation</div>
      <div class="col">
        <PBScrollArea class="fit">
          <PBTree
            v-if="treeState.pageBuilderJson"
            ref="treeRef"
            dense
            default-expand-all
            :nodes="[treeState.pageBuilderJson]"
            node-key="id"
            label-key="name"
            v-model:expanded="state.expandedNodeKeys"
            :selected="computedState.selectedNodeKey.value"
            @update:selected="methods.updateSelectedNodeKey"
            selected-color="pb-editor-primary"
          >
            <template v-slot:default-header="scope">
              <PBNode
                :ref="`pbtree_node_${scope.node.id}`"
                :node="scope.node"
                :my-tree-id="props.myTreeId"
                :selected-node-key="computedState.selectedNodeKey.value || undefined"
              />
            </template>
          </PBTree>
        </PBScrollArea>
      </div>
    </div>
  </PBDrawer>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, watch, getCurrentInstance } from 'vue';
import { useQuasar } from 'quasar';
import { useTree } from './../../../../tree';
import components from './../../../../components';
import PBScrollArea from '@lib-improba/components/page-builder/lib/ui/local-components/scroll-areas/PBScrollArea.vue';
import PBTree from '@lib-improba/components/page-builder/lib/ui/local-components/tree/PBTree.vue';
import PBNode from '@lib-improba/components/page-builder/lib/ui/local-components/tree/PBNode.vue';
import PBBanner from '@lib-improba/components/page-builder/lib/ui/local-components/banners/PBBanner.vue';
import PBDrawer from '../components/PBDrawer.vue';

export default defineComponent({
  components: {
    PBScrollArea,
    PBTree,
    PBBanner,
    PBDrawer,
    PBNode,
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: ['update:pageBuilderJson'],
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;
    const tree = useTree(props.myTreeId);

    const treeState = tree.sharedState;
    const findNodeByIdRecursively = tree.methods.findNodeByIdRecursively;
    const findAllIdsRecursively = tree.methods.findAllIdsRecursively;

    const treeRef = ref<any>(null);

    const { proxy } = getCurrentInstance() || { proxy: null }

    const state = reactive({
      expandedNodeKeys: [] as number[],
      selectedNode: [] as number[],
    });

    const computedState = {
      selectedComponent: computed(() => {
        const selected = treeState.selected;

        if (!selected) {
          return null;
        }

        const compo = (<any>components)[selected.name];

        return compo;
      }),
      selectedNodeKey: computed(() => {
        const selected = treeState.selected;

        if (!selected) {
          return null;
        }

        return selected.id;
      }),
    };

    const methods = {
      updateSelectedNodeKey(nodeKey: number) {
        const res = findNodeByIdRecursively(nodeKey);
        if (res) {
          treeState.selected = res.node;
        }
      },
    };

    watch(
      () => treeState.pageBuilderJson,
      () => {
        if (!treeState.pageBuilderJson) {
          return;
        }

        const ids = findAllIdsRecursively(treeState.pageBuilderJson);
        state.expandedNodeKeys = ids;
      },
      {
        deep: true,
      }
    );

    // ? Scroll to the pbtree selected node
    watch(
      () => treeState.selected,
      (selected) => {
        if (!selected || !proxy) { return }
        const { id } = selected

        const nodeRef = (proxy.$refs[`pbtree_node_${id}`] as any)?.$el
        if (!nodeRef) { return }

        nodeRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    )

    return {
      props,
      state,
      screen,
      treeState,
      tree,
      computedState,
      methods,
      treeRef,
    };
  },
});
</script>

<style scoped lang="scss">
.icon {
  &:deep() {
    .q-icon {
      font-size: 0.9rem;
    }
  }
}
</style>
