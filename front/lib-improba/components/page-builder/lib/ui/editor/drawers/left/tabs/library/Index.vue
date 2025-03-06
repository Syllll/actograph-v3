<template>
  <div class="fit column q-col-gutter-md q-pa-md">
    <div class="col-auto row justify-center">
      <DSearchInput
        v-model="state.search"
        style="width: 20rem"
        placeholder="Enter search text"
      />
    </div>
    <DScrollArea class="col full-width">
      <CompoList
        :myTreeId="$props.myTreeId"
        :search="state.search"
        dragAndDrop
      />
    </DScrollArea>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useTree } from './../../../../../../tree';
import { useSelectedComponent, IProp } from './../../use-selected-component';
import CompoList from '@lib-improba/components/page-builder/lib/ui/local-components/list-check-or-drag/Index.vue';

export default defineComponent({
  components: {
    CompoList,
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
    const selectedComponent = useSelectedComponent(props.myTreeId);

    const state = reactive({
      search: '',
    });

    const methods = {};

    return { props, state, methods, screen, treeState, selectedComponent };
  },
});
</script>
