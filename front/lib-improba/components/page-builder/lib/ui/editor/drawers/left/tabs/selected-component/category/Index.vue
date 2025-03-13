<template>
  <div class="column full-width">
    <div class="q-my-sm">
      <slot name="title">
        <div class="text-h6">
          {{ methods.capitalizeFirstLetter($props.category.name) }}
        </div>
      </slot>
    </div>
    <div class="column q-gutter-y-sm full-width">
      <slot>
        <div class="row full-width q-col-gutter-sm">
          <!-- Loop on each property within a category -->
          <template
            v-for="(prop, index) of computedState.filteredProps.value"
            :key="index"
          >
            <div :class="`${prop.class ? prop.class : 'col-12'} row`">
              <FormInput
                :myTreeId="$props.myTreeId"
                :prop="prop"
                :type="prop.options ? 'select' : undefined"
                :options="prop.options"
                :placeholder="prop.placeholder"
              >
              </FormInput>
            </div>
          </template>
        </div>
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';
import { useQuasar } from 'quasar';
import { IProp } from './../../../use-selected-component';
import FormInput from './FormInput.vue';
import { capitalizeFirstLetter } from '@lib-improba/utils/general.utils';
import { useTree } from '@lib-improba/components/page-builder/lib/tree';
import { INode } from '@lib-improba/components/page-builder/lib/tree/types';

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
  components: { FormInput },
  emits: [],
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const state = reactive({
      options: null as null | any[],
    });

    const methods = { capitalizeFirstLetter };

    const computedState = {
      filteredProps: computed(() => {
        const propList = props.category.props;

        const hasDisplayCondition = propList?.some(
          (prop) => !!prop.displayCondition
        );
        if (!hasDisplayCondition) {
          return props.category.props;
        }

        // Reset non-displayed fields to avoid undesired ghost values
        props.category.props
          ?.filter(
            (prop) =>
              prop.displayCondition?.(treeState.selected as INode) === false
          )
          ?.forEach((prop) => {
            const { selected } = treeState;
            if (!selected) {
              return;
            }

            selected.props[prop.name] = null;
            // <!-- TODO handle the responsive stuff -->
            // selected.props['__screen'][selected?.props['__screen']][prop.name] = null;
          });

        return props.category.props?.filter(
          (prop) => prop.displayCondition?.(treeState.selected as INode) ?? true
        );
      }),
    };

    return { props, state, methods, computedState, screen };
  },
});
</script>
