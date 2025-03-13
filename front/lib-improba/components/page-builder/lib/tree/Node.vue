<template>
  <div
    v-if="!tree.sharedState.readonly"
    class="relative-position no-pointer-events"
    style="width: 0px; height: 0px; z-index: 10"
  >
    <div
      class="absolute no-pointer-events"
      :style="`
      top: 0;
      left: 0;
      width: ${computedState.componentPosition.value.width}px;
      height: ${computedState.componentPosition.value.height}px;
      z-index: 10;
    `"
    >
      <div
        v-if="
          (state.hover || state.hoverToolbar) &&
          !tree.sharedState.readonly &&
          !$props.builderJson.readonly &&
          (!tree.sharedState.selected ||
            tree.sharedState.selected.id === props.builderJson.id)
        "
        class="absolute-top all-pointer-events"
        style="width: 15rem"
        @mouseover="state.hoverToolbar = true"
        @mouseenter="state.hoverToolbar = true"
        @mouseleave="state.hoverToolbar = false"
      >
        <div
          class="row bg-pb-editor-background-dark-60 blur text-pb-editor-text"
        >
          <div class="non-selectable">
            {{ props.builderJson.id }} - {{ props.builderJson.name }}
          </div>
          <d-action-btn
            icon="content_copy"
            size="0.6rem"
            @click.stop="methods.copy"
          />
          <d-action-remove-btn size="0.6rem" @click.stop="methods.remove" />
        </div>
      </div>
    </div>
  </div>

  <component
    ref="compoRef"
    :is="`${props.builderJson.name}`"
    v-bind="cBuilderVars.state.populatedProps"
    :myTreeId="props.myTreeId"
    :builderVars="props.builderVars"
    :objectInTreeId="props.builderJson.id"
    class="all-pointer-events smooth"
    :class="{
      'disable-pointer-events-children': !tree.sharedState.readonly,

      // SELECTED
      'rounded-less inner-border-pb-editor-accent-thin':
        !computedState.isReadonly.value &&
        tree.sharedState.selected?.id === props.builderJson.id,
      // || tree.sharedState.softSelected?.id === props.builderJson.id,

      // ? COPIED
      'rounded-lesser inner-border-pb-editor-secondary-thin':
        !computedState.isReadonly.value &&
        tree.sharedState.copiedNode?.id === props.builderJson.id,

      // ? HOVER
      'hover:rounded-morer hover:inner-border-pb-editor-neutral-thin':
        !computedState.isReadonly.value &&
        tree.sharedState.selected?.id !== props.builderJson.id &&
        // tree.sharedState.softSelected?.id !== props.builderJson.id &&
        tree.sharedState.copiedNode?.id !== props.builderJson.id,

      'inner-border-pb-editor-neutral-thiner':
        tree.sharedState.outline &&
        tree.sharedState.selected?.id !== props.builderJson.id &&
        tree.sharedState.copiedNode?.id !== props.builderJson.id,
    }"
    @mouseover="state.hover = true"
    @mouseenter="state.hover = true"
    @mouseleave="state.hover = false"
    @click="methods.select($event)"
  >
    <!-- Populate listed slots -->
    <template
      v-for="(slotKey, index) in state.slots"
      :key="index"
      v-slot:[slotKey]
    >
      <template v-if="methods.child(slotKey)">
        <template
          v-for="(child, iindex) in methods.children(slotKey)"
          :key="iindex"
        >
          <Node
            :builderJson="child"
            :builderVars="props.builderVars"
            :builderStyle="props.builderStyle"
            :myTreeId="props.myTreeId"
          />
        </template>
      </template>
      <template
        v-else-if="
          !state.hideFreeSlots &&
          !tree.sharedState.readonly &&
          !$props.builderJson.readonly
        "
      >
        <EmptySlot
          :slotName="slotKey"
          :parentId="props.builderJson.id"
          :myTreeId="$props.myTreeId"
        />
      </template>
    </template>
  </component>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  watch,
  ref,
  reactive,
  PropType,
  computed,
} from 'vue';
import { dom } from 'quasar';
import config from '../config';
import EmptySlot from './empty-slot/Index.vue';
import { useTree } from './index';
import { notify } from './../utils/notify.utils';
import { useBuilderVars } from './use-builder-vars';
import { INode } from './types';
import { useDragCard } from './../ui/local-components/list-check-or-drag/use-drag-card';

export default defineComponent({
  name: 'Node',
  components: {
    EmptySlot,
    ...config.components,
  },
  emits: [],
  props: {
    builderJson: {
      type: Object as PropType<INode>,
      required: true,
    },
    myTreeId: {
      type: String,
      required: true,
    },
    builderVars: {
      type: Object,
      required: false,
    },
    builderStyle: {
      type: Object,
      required: false,
    },
  },
  setup(props, context) {
    const tree = useTree(props.myTreeId);
    const actions = tree.methods.actions;
    const builderVars = useBuilderVars(props);
    const drag = useDragCard();

    const compoRef = ref<any>(null);

    const state = reactive({
      hover: false,
      hoverToolbar: false,
      hideFreeSlots: false,
      slots: [] as any[],
      allowOverlay: true,
    });

    const computedState = {
      isReadonly: computed(() => {
        return tree.sharedState.readonly || props.builderJson.readonly;
      }),
      componentPosition: computed(() => {
        const output = {
          width: 0,
          height: 0,
        };

        let compo = compoRef.value;
        if (!compo) {
          return output;
        }

        if (!compo.$el?.getBoundingClientRect) {
          return output;
        }

        output.width = dom.width(compo.$el);
        output.height = dom.height(compo.$el);
        return output;
      }),
    };

    const methods = {
      child: (slot: string) => {
        return props.builderJson.children?.find(
          (child: any) => child.slot === slot
        );
      },
      children: (slot: string) => {
        // Get the children
        const childrenForSlot = props.builderJson.children?.filter(
          (child: any) => child.slot === slot
        );

        return childrenForSlot;
      },
      select: (event: any) => {
        event.stopPropagation();
        // if (tree.sharedState.softSelected?.id === props.builderJson.id) {
        tree.sharedState.selected = props.builderJson;
        // tree.sharedState.softSelected = null;
        // } else {
        //   tree.sharedState.softSelected = props.builderJson;
        // }
      },
      check: () => {
        if (!compoRef.value || !props.builderJson?.children?.length) {
          return;
        }

        const slots = state.slots;

        // Loop on each child and check if its slot exists
        for (const child of props.builderJson.children) {
          if (!slots.find((slotName) => slotName === child.slot)) {
            throw new Error(
              `The element "${props.builderJson.name}" with id=${props.builderJson.id} has a child with slot="${child.slot}" but the component does not have a slot with that name.`
            );
          }
        }
      },
      copy() {
        tree.sharedState.copiedNode = props.builderJson;
        notify({
          message: 'Copy done!',
          color: 'positive',
          position: 'top',
        });
      },
      remove(event: any) {
        actions.remove({
          targetId: props.builderJson.id,
          treeId: props.myTreeId,
        });
        notify({
          message: 'Removal done!',
          color: 'positive',
          position: 'top',
        });
      },
    };

    // onMounted(() => {
    // A component must have a name
    const compo = config.components[props.builderJson.name];
    if (!compo) {
      throw new Error(`Component ${props.builderJson.name} is not registered`);
    }

    // A registered component must have a builderOptions property
    const builderOptions = compo.builderOptions;
    if (!builderOptions) {
      throw new Error(
        `Component ${props.builderJson.name} does not have a builderOptions property`
      );
    }

    // If the component has registered slots (listed in builderOptions), check if it exists in its dom (html)
    const slots = builderOptions.slots;
    const hideFreeSlots = builderOptions.hideFreeSlots;
    state.slots = slots;
    state.hideFreeSlots = hideFreeSlots === true ? true : false;
    methods.check();
    //});

    onMounted(() => {});

    watch(
      () => props.builderJson,
      (val: any, prev: any) => {
        methods.check();
      },
      {
        deep: true,
      }
    );

    // <!-- TODO Scroll into view when selected change -->
    // watch(
    //   () => tree.sharedState.selected,
    //   () => {
    //     const { value: container } = compoRef
    //     const el = document.getElementsByClassName('node-selected')[0]
    //     if (!el) { return }

    //     console.log({ el, container })
    //   }
    // )

    return {
      tree,
      props,
      state,
      drag,
      computedState,
      methods,
      compoRef,
      cBuilderVars: builderVars,
    };
  },
});
</script>

<style scoped lang="scss">
.node {
  &-hover {
    position: relative;

    // border: solid 0.1rem rgb(66, 88, 160);
    box-shadow: inset 0 0 0 0.2rem var(--pb-editor-neutral);

    &:before {
      //border: solid 0.1rem rgb(66, 88, 160);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      content: '';
      box-shadow: inset 0 0 0 0.2rem var(--pb-editor-neutral);
      z-index: 8;
      pointer-events: none;
    }
  }

  &-copied {
    position: relative;

    box-shadow: inset 0 0 0 0.2rem var(--pb-editor-dark-purple);

    &:before {
      //border: solid 0.1rem rgb(66, 88, 160);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      content: '';
      box-shadow: inset 0 0 0 0.2rem var(--pb-editor-dark-purple);
      z-index: 9;
      pointer-events: none;
    }
  }

  &-selected {
    position: relative;

    // border: solid 0.1rem #f00;
    box-shadow: inset 0 0 0 0.2rem var(--pb-editor-accent);

    &:before {
      //border: solid 0.1rem rgb(66, 88, 160);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      content: '';
      box-shadow: inset 0 0 0 0.2rem var(--pb-editor-accent) !important;
      z-index: 10;
      pointer-events: none;
    }
  }

  &-copied {
    position: relative;
    box-shadow: inset 0 0 0 0.2rem var(--pb-editor-secondary);
  }
}

.disable-pointer-events-children {
  &:deep() {
    * {
      // This targets all direct children of .parent-class
      pointer-events: none;
    }
  }
}
</style>
