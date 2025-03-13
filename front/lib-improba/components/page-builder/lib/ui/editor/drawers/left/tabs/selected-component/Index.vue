<template>
  <div class="column full-width">
    <div class="col-auto column full-width q-pa-md">
      <div class="text-h6">
        {{
          selectedComponent.computedState.selectedComponent?.value
            ?.builderOptions?.name ?? treeState.selected?.name
        }}
      </div>
      <div class="text-subtitle1">
        {{
          selectedComponent.computedState.selectedComponent?.value
            ?.builderOptions?.description
        }}
      </div>
    </div>
    <div class="col full-width">
      <div
        v-if="tree.sharedState.selected?.readonly"
        class="q-my-md q-px-md text-bold"
      >
        Modification non autorisée
      </div>
      <PBScrollArea v-else class="fit full-width">
        <div class="full-width column q-gutter-y-md text-pb-primary q-px-md">
          <!-- Loop on each category -->
          <template
            v-for="(category, catIndex) of selectedComponent.methods.listProps(
              selectedComponent.computedState.selectedComponent.value
            )"
            :key="catIndex"
          >
            <template
              v-if="
                category.name.toLowerCase() === 'taille' ||
                category.name.toLowerCase() === 'size'
              "
            >
              <CategorySize :category="category" :myTreeId="$props.myTreeId" />
            </template>
            <template v-else>
              <Category :category="category" :myTreeId="$props.myTreeId">
              </Category>
            </template>
          </template>
        </div>
      </PBScrollArea>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useTree } from './../../../../../../tree';
import { useSelectedComponent, IProp } from './../../use-selected-component';
import Category from './category/Index.vue';
import CategorySize from './category//custom/CategorySize.vue';
import PBScrollArea from '@lib-improba/components/page-builder/lib/ui/local-components/scroll-areas/PBScrollArea.vue';

export default defineComponent({
  components: { Category, CategorySize, PBScrollArea },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: [],
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const selectedComponent = useSelectedComponent(props.myTreeId);

    const state = reactive({});

    const methods = {};

    return {
      props,
      state,
      methods,
      screen,
      tree,
      treeState,
      selectedComponent,
    };
  },
});
</script>
