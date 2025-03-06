<template>
  <div
    class="smooth rounded not-hover:blur"
    :class="{
      'position-absolute q-ma-md hover:bg-pb-editor-background not-hover:bg-pb-editor-background-50': !computedState.currentDrawer.value.sticky,
      'position-relative bg-pb-editor-background': computedState.currentDrawer.value.sticky,
      'q-pa-md': computedState.currentDrawer.value.show,
    }"
    :style="{
      width: computedState.currentDrawer.value.show ? computedState.currentDrawer.value.width : '0px',
      height: !computedState.currentDrawer.value.sticky ? 'calc(100vh - 50px - 25px)' : '', // 50px for navbar height / 25px for margin
      right: props.type === 'right' ? 0 : '',
      overflow: 'visible',
      zIndex: 999,
    }"
    @click="drawers.methods.toggleDrawerState('active', props.type as EDrawerTypes)"
  >
    <div
      class="absolute-center"
      style="z-index: 999;"
      :style="{
        left: props.type === 'right' ? '0%' : '100%'
      }"
    >
      <q-btn
        class="bg-pb-editor-accent"
        size="0.6em"
        :style="{
          height: !computedState.currentDrawer.value.sticky ? '50px': ''
        }"
        dense
        flat
        text-color="white"
        :round="computedState.currentDrawer.value.sticky"
        :icon="computedState.currentDrawer.value.show ? `chevron_${props.type}` : `chevron_${state.oppositeType}`"
        @click="computedState.currentDrawer.value.show = !computedState.currentDrawer.value.show"
        @mouseenter="drawers.sharedState.showOnHover && !computedState.currentDrawer.value.sticky && (computedState.currentDrawer.value.show = true)"
      />
    </div>

    <div v-if="computedState.currentDrawer.value.show" class="fit column text-pb-editor-text">
      <slot />
    </div>

  </div>
</template>

<script lang="ts">
import { PropType, computed, defineComponent, onMounted, reactive, watch } from 'vue';
import { useDrawers } from '../../../use-drawers';
import { useProps } from '../../../use-props';
import { EDrawerTypes, TDrawerTypes } from '../../../interfaces/drawers.interface';

const { methods: propsMethods } = useProps()

export default defineComponent({
  props: {
    myTreeId: propsMethods.getPropByName('myTreeId'),
    type: {
      type: String,
      default: '',
    }
  },
  emits: [],
  setup(props) {
    const drawers = useDrawers(props.myTreeId)

    const stateless = {
    };

    const state = reactive({
      oppositeType: props.type === EDrawerTypes.left ? EDrawerTypes.right : EDrawerTypes.left,
      // Finds the correct drawer state based on the props.type (2024 me, no more any)
      // drawerState: (drawers.sharedState as IDrawerSharedState)[props.type as keyof typeof EDrawerTypes]
    });

    const methods = {
    };

    const computedState = {
      // * Note -> Computed so later maybe we can toggle drawer idk
      currentDrawer: computed(() => drawers.sharedState[props.type as EDrawerTypes])
    };


    watch(
      () => state,
      (v) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {
    });

    return {
      props,
      drawers,
      stateless,
      state,
      methods,
      computedState
    };
  },
});
</script>
