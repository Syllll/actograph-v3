<template>
  <DBtnDropdown
    title="Drawers"
    class="q-mx-sm q-px-sm"
    dense
    dropdown-icon="mdi-backburger"
  >
    <DBtn
      flat
      dense
      class="q-mx-sm"
      icon="mdi-dock-left"
      :title="`${
        drawers.sharedState[EDrawerTypes.left].sticky ? 'Désa' : 'A'
      }ncrer le panneau de gauche`"
      @click="methods.toggleStickyDrawers('left')"
    />
    <DBtn
      flat
      dense
      class="q-mx-sm"
      icon="mdi-format-horizontal-align-center"
      title="Ancer/Désancrer les 2 panneaux"
      @click="methods.toggleStickyDrawers()"
    />
    <DBtn
      flat
      dense
      class="q-mx-sm"
      icon="mdi-dock-right"
      :title="`${
        drawers.sharedState[EDrawerTypes.right].sticky ? 'Désa' : 'A'
      }ncrer le panneau de gauche`"
      @click="methods.toggleStickyDrawers('right')"
    />
    <DBtn
      flat
      dense
      class="q-mx-sm"
      :icon="
        drawers.sharedState.showOnHover
          ? 'mdi-cursor-default-click-outline'
          : 'mdi-cursor-default-click'
      "
      title="Ouvrir les panneaux avec un clic"
      @click="
        drawers.sharedState.showOnHover = !drawers.sharedState.showOnHover
      "
    />
  </DBtnDropdown>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { useDrawers } from '@lib-improba/components/page-builder/lib/ui/use-drawers';
import { EDrawerTypes } from '../../../interfaces/drawers.interface';

export default defineComponent({
  props: {
    type: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const drawers = useDrawers('');

    const stateless = {};

    const state = reactive({});

    const methods = {
      toggleStickyDrawers(type?: string) {
        drawers.methods.toggleDrawerState(
          'show',
          type as EDrawerTypes | null,
          true
        );
        drawers.methods.toggleDrawerState(
          'sticky',
          type as EDrawerTypes | null
        );
      },
    };

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {});

    return {
      EDrawerTypes,
      drawers,
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
