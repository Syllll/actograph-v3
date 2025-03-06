<template>
  <DScrollArea class="fit q-pa-md">
    A remplir avec du contenu global concernant la page en cours d'édition :
    palette de couleurs par exemple.

    <div class="full-with">
      <PBFormInput v-model="state.textColor" label="Couleur du texte">
        <template v-slot:append>
          <q-icon name="colorize" class="cursor-pointer">
            <q-popup-proxy
              cover
              transition-show="scale"
              transition-hide="scale"
            >
              <q-color v-model="state.textColor" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </PBFormInput>
    </div>
  </DScrollArea>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  watch,
  onMounted,
  nextTick,
} from 'vue';
import { useQuasar } from 'quasar';
import { useTree } from './../../../../../../tree';
import { useSelectedComponent, IProp } from './../../use-selected-component';
import PBFormInput from '@lib-improba/components/page-builder/lib/ui/local-components/inputs/PBFormInput.vue';
import { useBuilderStyle } from '@lib-improba/components/page-builder/lib/ui/use-builder-style';

export default defineComponent({
  components: {
    PBFormInput,
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
    const builderStyle = useBuilderStyle(tree.stateless.treeId);

    const state = reactive({
      textColor: '' as string,
    });

    const methods = {};

    onMounted(() => {
      nextTick(() => {
        state.textColor = builderStyle.methods.getCssColor('text');
      });
    });

    watch(
      () => state.textColor,
      () => {
        const currentColor = builderStyle.methods.getCssColor('text');
        if (currentColor === state.textColor) {
          return;
        }

        builderStyle.methods.setCssColor('text', state.textColor);
      }
    );

    return {
      props,
      state,
      methods,
      screen,
      treeState,
      selectedComponent,
      builderStyle,
    };
  },
});
</script>
