<template>
  <div class="column q-gutter-y-md">
    <div
      v-for="(cat, indexCat) of computedState.categories.value"
      :key="indexCat"
    >
      <DExpansionItem
        :label="`${cat.label} (${cat.components.length})`"
        :modelValue="!!props.search"
      >
        <div
          v-if="cat.components"
          class="full-width row q-gutter-md justify-center"
        >
          <template
            v-for="(item, index) of cat.components?.filter(
              (i) => !!i[1].builderOptions
            )"
            :key="index"
          >
            <div class="col-5">
              <CompoCard
                class="fit"
                :draggable="props.dragAndDrop"
                :_name="item[0]"
                :name="item[1].builderOptions.name ?? item[0]"
                :isDefault="item[1].__isDefault"
                :description="item[1].builderOptions.description"
                :icon="item[1].builderOptions.icon"
                :selectedName="props.selectedComponentName"
                @update:selectedName="
                  $emit('update:selectedComponentName', $event)
                "
              />
            </div>
          </template>
        </div>
      </DExpansionItem>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  watch,
  computed,
} from 'vue';
import config from '../../../config';
import { useTree } from '../../../tree';
import { extractAvailComponents } from './../../../utils';
import CompoCard from './Card.vue';

export default defineComponent({
  components: {
    CompoCard,
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
    search: {
      type: String,
      required: false,
      default: null,
    },
    selectedComponentName: {
      type: String,
    },
    dragAndDrop: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:selectedComponentName'],
  setup(props, context) {
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const formRef = ref(null);

    const stateless = {};
    const state = reactive({
      triggerClose: false,
      loading: false,
      availComponents: [] as any[],
    });

    const computedState = {
      categories: computed(() => {
        const components = state.availComponents;
        const categories = [] as { label: string; components: any[] }[];
        for (const compo of components) {
          const category = compo[1].builderOptions?.category ?? 'Autre';
          const categoryIndex = categories.findIndex(
            (c) => c.label === category
          );
          if (categoryIndex === -1) {
            categories.push({
              label: category,
              components: [compo],
            });
          } else {
            categories[categoryIndex].components.push(compo);
          }
        }

        return categories;
      }),
    };

    onMounted(() => {
      methods.init();
      state.loading = false;
    });

    const methods = {
      init: () => {
        let availComponents = extractAvailComponents({
          components: config.components,
          filterAvailableComponents: tree.methods.filterAvailableComponents,
        });
        if (props.search) {
          availComponents = availComponents.filter((c: any) => {
            return c[0]
              .toLowerCase()
              .includes((<string>props.search).toLowerCase());
          });
        }
        state.availComponents = availComponents;
      },
    };

    watch(
      () => props.search,
      () => {
        methods.init();
      }
    );

    return {
      stateless,
      state,
      props,
      formRef,
      methods,
      treeState,
      computedState,
    };
  },
});
</script>
