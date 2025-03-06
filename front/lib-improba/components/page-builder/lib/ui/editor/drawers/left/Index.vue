<template>
  <PBDrawer
    :myTreeId="props.myTreeId"
    type="left"
  >
    <PBTabView
      class="col full-width"
      expand
      no-padding
      :tabs="stateless.tabs"
      tabsAlign="center"
      bgColor="transparent"
      tabBgColor="pb-editor-secondary"
      activeBgColor="pb-editor-accent"
      hideIndicator
      v-model:tab="drawers.sharedState.left.currentTab"
    >
      <template v-slot:global>
        <Global :myTreeId="$props.myTreeId" />
      </template>
      <template v-slot:selectedComponent>
        <SelectedComponentTab
          class="col fit"
          v-if="
            drawers.sharedState.left.show &&
            selectedComponent.computedState.selectedComponent.value
          "
          :myTreeId="$props.myTreeId"
        />
      </template>
      <template v-slot:library>
        <LibraryTab :myTreeId="$props.myTreeId" />
      </template>
    </PBTabView>
    <q-separator class="q-my-sm" />
    <div class="col-auto">
      <Toolbar :myTreeId="$props.myTreeId" />
    </div>
  </PBDrawer>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
// import { useQuasar } from 'quasar';
// import { useTree } from './../../../../tree';
import { useSelectedComponent } from './use-selected-component';

import PBTabView from '@lib-improba/components/page-builder/lib/ui/local-components/tab-view/PBTabView.vue';
import PBDrawer from '../components/PBDrawer.vue';

import { tabs } from './tabs';
import SelectedComponentTab from './tabs/selected-component/Index.vue';
import LibraryTab from './tabs/library/Index.vue';
import Global from './tabs/global/Index.vue';
import Toolbar from './toolbar/Index.vue';
import { useDrawers } from '../../../use-drawers';
// import { onMounted } from 'vue';

export default defineComponent({
  components: {
    PBTabView,
    PBDrawer,

    SelectedComponentTab,
    LibraryTab,
    Global,
    Toolbar,
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: ['update:pageBuilderJson'],
  setup(props, context) {
    // const quasar = useQuasar();
    // const screen = quasar.screen;
    // const tree = useTree(props.myTreeId);
    // const treeState = tree.sharedState;

    const selectedComponent = useSelectedComponent(props.myTreeId);
    const drawers = useDrawers(props.myTreeId, { tabs })

    const stateless = {
      tabs,
    };

    const state = reactive({
    });

    const methods = {};

    // watch(
    //   () => selectedComponent.computedState.selectedComponent.value,
    //   (val): any => {
    //     if (val) {
    //       drawers.methods.openTab('selectedComponent')
    //     }
    //   }
    // );

    return {
      props,
      drawers,
      state,
      stateless,
      methods,
      // screen,
      // treeState,
      selectedComponent,
    };
  },
});
</script>
