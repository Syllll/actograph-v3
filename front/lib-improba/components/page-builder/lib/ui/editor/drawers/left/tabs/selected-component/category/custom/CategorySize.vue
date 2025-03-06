<template>
  <Category :category="$props.category" :myTreeId="$props.myTreeId">
    <div class="full-width">
      <div class="row q-col-gutter-sm">
        <template v-for="(prop, index) of $props.category.props" :key="index">
          <div class="col-6">
            <FormInput :myTreeId="$props.myTreeId" :prop="prop"> </FormInput>
          </div>
        </template>
      </div>
    </div>
  </Category>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { useTree } from './../../../../../../../../tree';
import {
  useSelectedComponent,
  IProp,
} from './../../../../use-selected-component';
import Category from './../Index.vue';
import FormInput from './../FormInput.vue';

export default defineComponent({
  props: {
    category: {
      type: Object as PropType<{ name: string; props: IProp[] }>,
      required: true,
    },
    myTreeId: {
      type: String,
      required: true,
    },
  },
  components: { FormInput, Category },
  emits: [],
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const selectedComponent = useSelectedComponent(props.myTreeId);

    const state = reactive({});

    const methods = {};

    return { props, state, methods, screen, treeState, selectedComponent };
  },
});
</script>
