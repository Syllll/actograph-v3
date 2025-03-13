<template>
  <div
    class="q-px-sm q-py-xs row items-center rounded full-width bg-pb-editor-secondary-60"
  >
    <q-icon
      v-if="methods.findComponentIcon(node.name)"
      :name="methods.findComponentIcon(node.name)"
      class="q-mr-sm col-auto text-pb-editor-text"
    />
    <div
      class="col font-weight-bold"
      :class="{
        'text-pb-editor-accent': props.selectedNodeKey === node.id,
      }"
    >
      <!--{{ node.name === 'Bloc' ? node.props.name : node.name }}-->
      <!--(id: {{ node.id }}) -->
      {{ methods.findComponentNameToShow(node.name) }}
    </div>
    <div class="row col-auto">
      <div class="column" v-if="!node.copied">
        <PBActionBtn
          class="col-6 icon"
          icon="arrow_upward"
          size="0.4rem"
          :disable="node.readonly"
          @click="
            methods.moveUp(node);
            $event.stopPropagation();
          "
        />
        <PBActionBtn
          class="col-6 icon"
          icon="arrow_downward"
          size="0.4rem"
          :disable="node.readonly"
          @click="
            methods.moveDown(node);
            $event.stopPropagation();
          "
        />
      </div>

      <PBActionBtn
        v-if="!node.copied"
        icon="mdi-content-copy"
        size="0.6rem"
        :disable="node.readonly"
        @click="
          methods.copy(node);
          $event.stopPropagation();
        "
      />
      <PBActionBtn
        v-else
        icon="mdi-close-box-multiple-outline"
        size="O.6rem"
        @click="
          methods.cancelCopy(node);
          $event.stopPropagation();
        "
      >
      </PBActionBtn>
      <PBActionRemoveBtn
        v-if="!node.copied"
        size="0.6rem"
        :disabled="node.readonly"
        @click="
          methods.remove(node);
          $event.stopPropagation();
        "
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, reactive, watch } from 'vue';

import PBActionBtn from '@lib-improba/components/page-builder/lib/ui/local-components/buttons/PBActionBtn.vue';
import PBActionRemoveBtn from '@lib-improba/components/page-builder/lib/ui/local-components/buttons/PBActionRemoveBtn.vue';

import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';
import { useTree } from '../../../tree';
import { notify } from '../../../utils/notify.utils';

const { methods: propsMethods } = useProps();

export default defineComponent({
  components: {
    PBActionBtn,
    PBActionRemoveBtn,
  },
  props: {
    myTreeId: propsMethods.getPropByName('myTreeId'),
    readonly: propsMethods.getPropByName('readonly'),
    node: {
      type: Object,
      required: true,
    },
    selectedNodeKey: {
      type: Number,
    },
  },
  emits: [],
  setup(props) {
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const actions = tree.methods.actions;

    const stateless = {};

    const state = reactive({});

    const methods = {
      copy(node: any) {
        treeState.copiedNode = node;
        notify({
          message: 'Copy done!',
          color: 'positive',
          position: 'top',
        });
      },
      cancelCopy(node: any) {
        treeState.copiedNode = null;
      },
      moveUp(node: any) {
        actions.reorder({
          targetId: node.id,
          slot: node.slot,
          order: -1,
          treeId: props.myTreeId,
        });
      },
      moveDown(node: any) {
        actions.reorder({
          targetId: node.id,
          slot: node.slot,
          order: +1,
          treeId: props.myTreeId,
        });
      },
      remove(node: any) {
        actions.remove({
          targetId: node.id,
          treeId: props.myTreeId,
        });
        notify({
          message: 'removal done!',
          color: 'positive',
          position: 'top',
        });
      },
      findComponent: (name: string) => {
        return tree.methods.findComponentByName(name);
      },
      findComponentIcon: (name: string) => {
        const compo = methods.findComponent(name);
        return compo.builderOptions.icon;
      },
      findComponentNameToShow: (name: string) => {
        const compo = methods.findComponent(name);
        return compo.builderOptions.name ?? name;
      },
    };

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {});

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
