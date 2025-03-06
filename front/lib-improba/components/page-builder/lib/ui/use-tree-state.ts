import { defineComponent, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { useTree, generateTreeId } from '../tree';

export const useTreeState = (props: any, context: any) => {
  let treeId = props.myTreeId;
  if (!treeId) {
    treeId = generateTreeId();
  }

  const tree = useTree(treeId);
  const treeState = tree.sharedState;

  onBeforeMount(() => {
    treeState.pageBuilderJson = props.modelValue;

    if (props.filterAvailableComponents) {
      tree.methods.filterAvailableComponents = props.filterAvailableComponents;
    }
  });

  onBeforeUnmount(() => {
    tree.methods.clear(treeId);
  });

  watch(
    () => treeState.pageBuilderJson,
    (newVal) => {
      context.emit('update:modelValue', newVal);
    },
    {
      deep: true,
    }
  );

  watch(
    () => props.modelValue,
    (newVal) => {
      treeState.pageBuilderJson = props.modelValue;
    },
    {
      deep: true,
    }
  );

  watch(
    () => props.readonly,
    (newVal) => {
      treeState.readonly = props.readonly;
    }
  );

  return {
    stateless: tree.stateless,
    treeState,
    methods: {
      ...tree.methods,
      clear: () => {
        tree.methods.clear(treeId);
      },
    },
  };
};
