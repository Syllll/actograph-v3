<template>
  <Tree
    v-if="treeState.pageBuilderJson !== null"
    :myTreeId="stateless.treeId"
    :builderVars="$props.builderVars"
    :readonly="state.readonly"
  />
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  reactive,
  defineAsyncComponent,
  watch,
} from 'vue';
import { useQuasar, debounce } from 'quasar';
import { useBuilderStyle } from '../ui/use-builder-style';
import { useTreeState } from '../ui/use-tree-state';
import { onMounted } from 'vue';
import { blocService } from '@lib-improba/services/cms/blocs/index.service';
import { INode } from '../tree/types';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';

export default defineComponent({
  props: {
    blocId: {
      type: Number,
      required: true,
      builderOptions: { hide: true },
    },
    builderVars: {
      type: Object as PropType<any>,
      builderOptions: { hide: true },
    },
    myTreeId: {
      type: String,
      builderOptions: { hide: true },
    },
  },
  emits: ['update:modelValue'],
  builderOptions: {
    slots: [],
    description: 'To insert a bloc.',
  },
  components: {
    Tree: defineAsyncComponent(() => import('./../tree/Tree.vue')),
  },
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;

    const { treeState, stateless } = useTreeState(
      { ...props, myTreeId: undefined },
      context
    );

    const builderStyle = useBuilderStyle(stateless.treeId, props);

    const state = reactive({
      readonly: true,
    });

    const editableBlocId = props.builderVars?._EDITABLE_BLOC_ID;
    if (editableBlocId === props.blocId) {
      state.readonly = false;
    } else {
      state.readonly = true;
    }

    const methods = {
      init: async () => {
        const bloc = await blocService.findOneWithContent({
          id: props.blocId,
        });
        if (!bloc.content) {
          throw new Error('We must have a bloc content');
        }

        treeState.pageBuilderJson = bloc.content;
      },
      updateBlocContent: async (json: any) => {
        await adminBlocService.updateContent({
          id: props.blocId,
          content: json,
        });

        // This is required to update the json in the tree, for some reason...
        // state.json = json;
      },
    };

    onMounted(async () => {
      await methods.init();
    });

    watch(
      () => props.blocId,
      async () => {
        await methods.init();
      }
    );

    watch(
      () => treeState.pageBuilderJson,
      debounce(async () => {
        if (props.blocId && treeState.pageBuilderJson && !treeState.readonly) {
          await methods.updateBlocContent(treeState.pageBuilderJson);
        }
      }, 400),
      {
        deep: true,
      }
    );

    return {
      props,
      treeState,
      state,
      screen,
      stateless,
      builderStyle,
      methods,
    };
  },
});
</script>
