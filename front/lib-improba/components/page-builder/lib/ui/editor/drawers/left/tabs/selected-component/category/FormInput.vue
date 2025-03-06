<template>
  <PBFormInput
    v-if="selectedComponent.methods.findType(prop) === 'options' ? Array.isArray(state.options) : true"
    :type="selectedComponent.methods.findType(prop)"
    :label="`${selectedComponent.methods.capitalizeFirstLetter(
      $props.prop.label ?? $props.prop.name
    )}`"
    labelPosition="top"
    :hint="$props.prop.description"
    :rules="$props.prop.required ? ['required'] : prop.rules"
    :modelValue="state.modelValue"
    @update:modelValue="methods.updateModelValue($event)"
    :options="state.options"
  >
    <template v-if="$props.prop.responsive" v-slot:inner-label="scope">
      <div class="row">
        <PBFormInputLabel
          class="col-auto"
          :textRight="false"
          :label="scope.props.label"
          :tooltip="scope.props.labelTooltip"
          :bold="scope.props.labelBold"
        />
        <div class="col">
          <ResponsiveSelect v-model="state.responsive" @undoOverride="methods.undoResponsiveOverride"
            :screen="treeState.selected?.props['__screen']"
            :propName="$props.prop.name"
          />
        </div>
      </div>
    </template>

    <template v-slot v-if="$props.prop.editor">
      <PBEditor
        dense
        :modelValue="state.modelValue"
        @update:modelValue="methods.updateModelValue($event)"
      />
      <div class="text-pb-editor-text">
        {{ $props.prop.description }}
      </div>
    </template>
  </PBFormInput>
</template>

<script lang="ts">
import PBFormInput from '@lib-improba/components/page-builder/lib/ui/local-components/inputs/PBFormInput.vue';
import PBFormInputLabel from '@lib-improba/components/page-builder/lib/ui/local-components/inputs/PBFormInputLabel.vue';
import PBEditor from '@lib-improba/components/page-builder/lib/ui/local-components/markdown/PBMarkdownEditor.vue';
import { useQuasar } from 'quasar';
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { useTree } from './../../../../../../../tree';
import { useSelectedComponent } from './../../../use-selected-component';
import ResponsiveSelect from './ResponsiveSelect.vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  props: {
    prop: {
      type: Object,
      required: true,
    },
    myTreeId: {
      type: String,
      required: true,
    },
    options: {
      type: [Array, Function],
    }
  },
  components: { PBFormInput, PBEditor, PBFormInputLabel, ResponsiveSelect },
  emits: [],
  setup(props, context) {
    const quasar = useQuasar();
    const router = useRouter();
    const screen = quasar.screen;
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;

    const selectedComponent = useSelectedComponent(props.myTreeId);

    const state = reactive({
      responsive: '' as string,
      modelValue: null as any,
      options: undefined as undefined | any[],
    });

    const computedState = {};

    const methods = {
      init: async () => {
        state.options = undefined;

        if (props.prop.options) {
          if (typeof props.prop.options === 'function') {
            let opts = await props.prop.options();

            // Remove the current bloc from the options, if a current bloc is shown
            const currentUrl = router.currentRoute.value.fullPath;
            if (currentUrl.includes('editor/bloc/')) {
              const currentUrlSplitted = currentUrl.split('editor/bloc/')
              const blocIdStr = currentUrlSplitted[1].split('?')[0];

              opts = opts.filter((o: {
                label: string, value: number
              }) => o.value !== parseInt(blocIdStr));
            }

            state.options = opts;
          } else {
            state.options = props.prop.options;
          }
        }
      },
      getModelValue: () => {
        let value = props.prop.default;

        // If responsive is not selected, return the value of the prop
        if (!state.responsive) {
          value = treeState.selected?.props[props.prop.name];
        }
        // Responsive mode
        else {
          if (!treeState.selected) {
            throw new Error('No selected component');
          }

          let screen = treeState.selected?.props['__screen'];
          if (!screen) {
            if (!treeState.selected.props['__screen']) {
              treeState.selected.props['__screen'] = {};
            }
            screen = treeState.selected.props['__screen'];
          }
          if (!screen) {
            throw new Error('No screen');
          }

          if (!screen[state.responsive]) {
            screen[state.responsive] = {};
          }
          const r = screen[state.responsive];

          if (!r[props.prop.name]) {
            r[props.prop.name] = treeState.selected.props[props.prop.name] ?? props.prop.default;
          }

          value = r[props.prop.name];
        }

        return value;
      },
      updateModelValue: ($event: any) => {
        if (treeState.selected) {
          if (!state.responsive) {
            treeState.selected.props[props.prop.name] = $event;
          } else {
            treeState.selected.props['__screen'][state.responsive][props.prop.name] = $event;
          }
        }
      },
      undoResponsiveOverride: (event: any) => {
        if (treeState.selected) {
          if (treeState.selected.props['__screen']?.[event]?.[props.prop.name]) {
            delete treeState.selected.props['__screen'][event][props.prop.name];
            state.responsive = '';
          }
        }
      },
    };

    onMounted(async () => {
      await methods.init();
    })

    watch(() => [state.responsive, treeState.selected?.props], () => {
      state.modelValue = methods.getModelValue();
    }, {
      immediate: true,
      deep: true,
    });

    return {
      props,
      state,
      methods,
      screen,
      treeState,
      selectedComponent,
      computedState,
    };
  },
});
</script>
