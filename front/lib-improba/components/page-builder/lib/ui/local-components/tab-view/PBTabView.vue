<template>
  <div :class="{ fit: props.expand, column: props.expand }">
    <PBToolbar
      :minHeight="props.minHeight"
      :noScopedStyle="true"
      :class="{ 'col-auto': props.expand, row: true, 'full-width': true }"
      :bgColor="props.bgColor"
      center
      ><d-space v-if="props.tabsAlign === 'center'" />
      <q-tabs
        :modelValue="state.tab"
        @update:modelValue="
          props.tab ? $emit('update:tab', $event) : (state.tab = $event)
        "
        dense
        shrink
        stretch
        :class="`text-${props.textColor} bg-none q-pa-none ${
          props.expand ? 'full-width' : ''
        }`"
        :active-color="`${props.activeTextColor}`"
        :active-bg-color="`${
          props.activeBgColor === 'transparent'
            ? undefined
            : props.activeBgColor
        }`"
        :align="props.tabsAlign"
        :indicator-color="
          props.hideIndicator ? 'transparent' : props.indicatorColor
        "
      >
        <d-space
          v-if="props.beforeTabsSpace"
          :style="`width: ${props.beforeTabsSpace}`"
        />
        <q-tab
          :disable="props.disable"
          no-caps
          v-for="tab of props.tabs"
          :key="tab.name"
          :name="tab.name"
          :label="tab.label"
          :class="props.tabBgColor ? `bg-${props.tabBgColor}` : undefined"
        />
        <d-space v-if="props.afterTabsSpace" />
      </q-tabs>
      <d-space v-if="props.tabsAlign === 'center'" />
      <div v-if="props.afterTabsSpace" class="col row self-stretch">
        <slot name="actions"> </slot>
      </div>
    </PBToolbar>

    <q-tab-panels
      v-model="state.tab"
      @before-transition="methods.updateRoute"
      :class="`bg-${props.bgColor} ${props.expand ? 'col column expand' : ''}`"
    >
      <PBTabPanel
        v-for="tab of props.tabs"
        :key="tab.name"
        :name="tab.name"
        :bgColor="tab.bgColor ?? 'transparent'"
        :noPadding="$props.noPadding"
      >
        <!--{{ tab.name }}-->
        <slot :name="tab.name"> Content to fill </slot>
      </PBTabPanel>
    </q-tab-panels>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  PropType,
  reactive,
  watch,
  onMounted,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PBToolbar from './PBToolbar.vue';
import PBTabPanel from './PBTabPanel.vue';
import { useQueryParams } from 'src/../lib-improba/composables/use-query-params';

export default defineComponent({
  components: {
    PBToolbar,
    PBTabPanel,
  },
  props: {
    tabs: {
      type: Array as PropType<
        { name: string; label: string; [key: string]: any }[]
      >,
      required: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    useRouteQuery: {
      type: Boolean,
      default: false,
    },
    queryNameInRoute: {
      type: String,
      default: 'tab',
    },
    beforeTabsSpace: {
      type: String,
      default: null,
    },
    afterTabsSpace: {
      type: Boolean,
      default: null,
    },
    tabsAlign: {
      type: String as PropType<'justify' | 'center'>,
      default: 'justify',
    },
    expand: {
      type: Boolean,
      default: false,
    },
    activeTextColor: {
      type: String,
      default: 'pb-editor-text',
    },
    activeBgColor: {
      type: String,
      default: 'transparent',
    },
    hideIndicator: {
      type: Boolean,
      default: false,
    },
    indicatorColor: {
      type: String,
      default: null,
    },
    bgColor: {
      type: String,
      default: 'pb-editor-background',
    },
    textColor: {
      type: String,
      default: 'pb-editor-text',
    },
    tabBgColor: {
      required: false,
      type: String,
    },
    tab: {
      type: String,
      default: null,
    },
    minHeight: {
      type: String,
      default: undefined,
    },
    noPadding: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:tab'],
  setup(props, context) {
    const router = useRouter();
    const route = useRoute();
    const qp = useQueryParams();
    const { updateRouteQuery } = qp.methods;

    const state = reactive({
      tab: props.tabs[0].name,
    });

    const methods = {
      updateRoute: async (tab: any) => {
        if (props.useRouteQuery) {
          const tabName = props.queryNameInRoute;

          await updateRouteQuery({ [tabName]: state.tab });
        }
      },
    };

    onMounted(async () => {
      if (props.useRouteQuery && props.queryNameInRoute) {
        const tabName = props.queryNameInRoute;

        if (route.query.tab) state.tab = route.query[tabName]?.toString() ?? '';
        else await updateRouteQuery({ [tabName]: state.tab });
      }

      context.emit('update:tab', state.tab);
    });

    watch(
      () => state.tab,
      (val, prev) => {
        if (val !== route.query[props.queryNameInRoute])
          context.emit('update:tab', val);
      }
    );

    watch(
      () => props.tab,
      (val, prev) => {
        if (val && val !== state.tab) state.tab = val;
      },
      {
        immediate: true,
      }
    );

    return {
      props,
      state,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.expand {
  &:deep() {
    .q-panel,
    .q-tab-panel {
      display: flex;
      flex-wrap: wrap;
      flex: 10000 1 0%;
      flex-direction: column;
    }
  }
}
</style>
