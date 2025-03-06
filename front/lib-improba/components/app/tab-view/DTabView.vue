<template>
  <div :class="{ fit: props.expand, col: props.expand, column: props.expand }">
    <DToolbar
      :minHeight="props.minHeight"
      :noScopedStyle="true"
      :class="{ 'col-auto': props.expand }"
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
        :class="`text-${props.textColor} bg-none q-pa-none`"
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
        <template v-for="tab of props.tabs" :key="tab.name">
          <template v-if="$props.routerView">
            <q-route-tab
              :disable="props.disable"
              no-caps
              exact
              :label="tab.label"
              :class="props.tabBgColor ? `bg-${props.tabBgColor}` : undefined"
              :to="tab.to"
            />
          </template>
          <template v-else>
            <q-tab
              :disable="props.disable"
              no-caps
              :name="tab.name"
              :label="tab.label"
              :class="props.tabBgColor ? `bg-${props.tabBgColor}` : undefined"
            />
          </template>
        </template>
        <d-space v-if="props.afterTabsSpace" />
      </q-tabs>
      <d-space v-if="props.tabsAlign === 'center'" />
      <div v-if="props.afterTabsSpace" class="col row self-stretch">
        <slot name="actions"> </slot>
      </div>
    </DToolbar>

    <div
      v-if="$props.routerView"
      :class="{ col: props.expand, column: props.expand, expand: props.expand }"
    >
      <router-view />
    </div>
    <q-tab-panels
      v-else
      v-model="state.tab"
      @before-transition="methods.updateRoute"
      :class="{ col: props.expand, column: props.expand, expand: props.expand }"
    >
      <DTabPanel
        v-for="tab of props.tabs"
        :key="tab.name"
        :name="tab.name"
        :noPadding="tab.noPadding"
        :bgColor="tab.bgColor"
      >
        <!--{{ tab.name }}-->
        <slot :name="tab.name"> Content to fill </slot>
      </DTabPanel>
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
import { useQueryParams } from 'src/../lib-improba/composables/use-query-params';

import DToolbar from './DToolbar.vue';
import DTabPanel from './DTabPanel.vue';

export default defineComponent({
  components: {
    DToolbar,
    DTabPanel,
  },
  props: {
    routerView: {
      type: Boolean,
      default: false,
    },
    // To: a q-route, for example: { name: 'userspace.seances.index' }
    tabs: {
      type: Array as PropType<
        { name: string; label: string; to: string | any; [key: string]: any }[]
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
      default: 'text-text',
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
      default: 'primary',
    },
    textColor: {
      type: String,
      default: 'white',
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
