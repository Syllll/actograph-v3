<template>
  <div class="fit position-relative">
    <div class="fit row bg-pb-editor-background" style="overflow-x: hidden">
      <!-- v-if="state.editableTreeId && !props.isIframe" -->
      <LeftDrawer
        v-if="state.editableTreeId"
        class="col-3"
        :myTreeId="state.editableTreeId"
        :builderVars="props.builderVars"
      />
      <!-- <DScrollArea v-if="props.isIframe" class="fit"> -->
      <DScrollArea v-if="!state.useIFrame" class="fit">
        <Tree
          :myTreeId="stateless.treeId"
          :builderVars="props.builderVars"
          :builderStyle="<any>props.builderStyle"
          :readonly="treeState.readonly"
        />
      </DScrollArea>
      <div
        v-else
        :id="'container_' + stateless.treeId"
        class="col row items-center justify-center"
        style="width: 100vw !important"
      >
        <div class="position-relative not-selectable">
          <!-- ? RESIZE DIMENSIONS -->
          <div
            class="position-absolute fit shadow-transparent smooth no-pointer-events"
            :class="{ 'shadow-neutral': state.resize.x || state.resize.y }"
          >
            <div
              class="text-center smooth"
              :class="{
                'bg-transparent text-transparent':
                  !state.resize.x && !state.resize.y,
                'bg-pb-editor-background-dark-80 text-white':
                  state.resize.x || state.resize.y,
              }"
            >
              {{ Math.floor(parseInt(drawers.sharedState.frame.width)) }}
              x
              {{ Math.floor(parseInt(drawers.sharedState.frame.height)) }}
            </div>
          </div>

          <!-- ? IFRAME -->
          <iframe
            :id="'iframe_' + stateless.treeId"
            class="overflow-x-hidden border-none rounded-less bg-white"
            :class="{
              'no-pointer-events': state.resize.x || state.resize.y,
              smooth: !state.resize.x && !state.resize.y,
            }"
            :style="{
              width: drawers.sharedState.frame.width,
              height: drawers.sharedState.frame.height,
            }"
            :src="`${methods.getOrigin()}/cms-iframe/${stateless.treeId}`"
          />

          <!-- ? RIGHT RESIZE HANDLE -->
          <!-- TODO PUT HANDLES IN COMPONENT -->
          <div
            class="position-absolute row items-center full-height"
            style="top: 0; right: -5px"
          >
            <div
              @mousedown="methods.startResizing('x')"
              @mouseup="methods.stopResizing"
              class="clickable rounded smooth row items-center justify-center hover:bg-pb-editor-text"
              :class="{
                'bg-pb-editor-neutral':
                  !state.resize.x || (state.resize.x && state.resize.invert),
                'bg-pb-editor-text': state.resize.x && !state.resize.invert,
              }"
              style="height: 50px"
            >
              <q-icon name="mdi-arrow-split-vertical" />
            </div>
          </div>

          <!-- ? LEFT RESIZE HANDLE -->
          <!-- TODO PUT HANDLES IN COMPONENT -->
          <div
            class="position-absolute row items-center full-height"
            style="top: 0; left: -5px"
          >
            <div
              @mousedown="methods.startResizing('x', true)"
              @mouseup="methods.stopResizing"
              class="position-absolute clickable rounded smooth row items-center justify-center hover:bg-pb-editor-text"
              :class="{
                'bg-pb-editor-neutral':
                  !state.resize.x || (state.resize.x && !state.resize.invert),
                'bg-pb-editor-text': state.resize.x && state.resize.invert,
              }"
              style="height: 50px"
            >
              <q-icon name="mdi-arrow-split-vertical" />
            </div>
          </div>

          <!-- ? BOTTOM RESIZE HANDLE -->
          <!-- TODO PUT HANDLES IN COMPONENT -->
          <div
            class="position-absolute row justify-center full-width"
            style="bottom: 15px"
          >
            <div
              @mousedown="methods.startResizing('y')"
              @mouseup="methods.stopResizing"
              class="position-absolute clickable rounded smooth row items-center justify-center hover:bg-pb-editor-text"
              :class="{
                'bg-pb-editor-neutral': !state.resize.y,
                'bg-pb-editor-text': state.resize.y,
              }"
              style="width: 50px"
            >
              <q-icon name="mdi-arrow-split-horizontal" />
            </div>
          </div>

          <!-- ? CUBE RESIZE HANDLE -->
          <!-- TODO PUT HANDLES IN COMPONENT -->

          <div class="position-absolute" style="right: 0">
            <div
              @mousedown="
                methods.startResizing('y');
                methods.startResizing('x');
              "
              @mouseup="methods.stopResizing"
              class="position-absolute clickable rounded smooth not-hover:bg-pb-editor-neutral hover:bg-pb-editor-text"
              style="bottom: 0; right: -5px; height: 15px; width: 15px"
            />
          </div>
        </div>
      </div>
      <RightDrawer
        v-if="state.editableTreeId"
        class="col-3"
        :myTreeId="state.editableTreeId"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { useQuasar, debounce, TouchHoldValue } from 'quasar';
import { defineComponent, reactive, watch } from 'vue';
import type { PropType } from 'vue';

import { Tree } from './../../tree';
import LeftDrawer from './drawers/left/Index.vue';
import RightDrawer from './drawers/right/Index.vue';

import Toolbar from '@lib-improba/components/layouts/standard/toolbar/Index.vue';

import { INode } from '../../tree/types';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';

import { useSharedStates } from '../../tree/use-shared-states';
import { useBuilderStyle, builderStyleProps } from '../use-builder-style';
import { useTreeState } from '../use-tree-state';
import { useIFrame } from '../use-iframe/index';
import { useDrawers } from '../use-drawers';
import { useDragCard } from '../local-components/list-check-or-drag/use-drag-card';

export default defineComponent({
  components: {
    Toolbar,
    Tree,
    LeftDrawer,
    RightDrawer,
  },
  props: {
    isIframe: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: Object as PropType<INode>,
      required: false,
    },
    // pageUrl: {
    //   type: String,
    //   required: true
    // },
    readonly: {
      type: Boolean,
      default: false,
      description:
        'If true, the editor will be in readonly mode and the user will not be able to edit the page.',
    },
    blocId: {
      type: Number,
      required: false,
    },
    filterAvailableComponents: {
      type: Function as PropType<(components: string[]) => string[] | null>,
      default: () => null,
      description:
        'A function that will be called with the list of available components and should return the list of available components.',
    },
    myTreeId: {
      type: String,
      required: false,
    },
    builderVars: {
      type: Object,
      required: false,
    },
    ...builderStyleProps,
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const quasar = useQuasar();
    const screen = quasar.screen;

    // methods is where the props.modelValue is taken into account and processed
    const { treeState, stateless } = useTreeState(props, context);
    const builderStyle = useBuilderStyle(stateless.treeId, props);
    const iframe = useIFrame(stateless.treeId, { iframe: false });
    const drawers = useDrawers(stateless.treeId);
    const drag = useDragCard();

    if (props.blocId) {
      const editableBlocId = props.builderVars?._EDITABLE_BLOC_ID;
      if (editableBlocId && editableBlocId === props.blocId) {
        treeState.readonly = false;
      } else {
        treeState.readonly = true;
      }
    }

    const state = reactive({
      synced: false,
      useIFrame: true,
      editableTreeId: null as null | string,
      resize: {
        x: false,
        y: false,
        invert: false,
      },
    });

    const methods = {
      getOrigin: () => {
        return window.origin;
      },
      updateBlocContent: async (json: any) => {
        if (!props.blocId) {
          throw new Error('A blocId should be set');
        }

        await adminBlocService.updateContent({
          id: <number>props.blocId,
          content: json,
        });
      },
      startResizing(type?: string, invert?: boolean) {
        /**
         * _ Defines which axis to use
         * _ If no type is given, use both axis
         *
         * _ Adds event listener of targeted axis
         */

        if (!type) {
          state.resize.x = true;
          state.resize.y = true;
        } else {
          state.resize[type as keyof typeof state.resize] = true;
        }

        // If the drag starts from the left, it needs to be known for handleDragResize calculations
        state.resize.invert = !!invert;

        // Add both event listener to handle the drag and to know when to stop
        window.addEventListener('mousemove', methods.handleDragResize);
        window.addEventListener('mouseup', methods.stopResizing);
      },

      handleDragResize(event: MouseEvent) {
        if (!state.resize.x && !state.resize.y) {
          return;
        }
        const frame = document.getElementById(
          'iframe_' + stateless.treeId
        ) as HTMLElement;

        // <!-- _ Get mouse position -->
        const { clientX: mouseX, clientY: mouseY } = event;

        // <!-- _ Get window dimensions -->
        const { innerWidth, innerHeight } = window;

        // <!-- _ Get frame dimensions -->
        const { clientWidth: frameWidth, clientHeight: frameHeight } = frame;

        // <!-- _ Get frame min dimensions -->
        const { minWidth, minHeight } = drawers.sharedState.frame;

        // <!-- _ Handle width (x) resize -->
        if (state.resize.x) {
          const { left, right } = drawers.sharedState;

          /**
           * If a drawer is sticky and opened, the frame is offseted
           * We need to makes calculations according to it
           */
          const leftDrawerOffset = left.show && left.sticky ? 400 : 0;
          const rightDrawerOffset = right.show && right.sticky ? 400 : 0;

          const offsetX =
            (innerWidth - frameWidth) / 2 +
            leftDrawerOffset / 2 -
            rightDrawerOffset / 2;

          // If the drag starts from the left, we need to reverse the maths
          const calculatedWidth = state.resize.invert
            ? -(mouseX - offsetX - frameWidth)
            : mouseX - offsetX;

          // Prevent minWidth overflow (drawers.sharedState.frame.minWidth)
          const targetWidth =
            calculatedWidth <= minWidth ? minWidth : calculatedWidth;

          drawers.sharedState.frame.width = targetWidth + 'px';
        }

        // <!-- _ Handle height (y) resize -->
        if (state.resize.y) {
          /**
           ** Takes navbar height into account as it matter on the mouse position
           */
          const navHeight = 48;

          const offsetY = (innerHeight - frameHeight) / 2;
          const calculatedHeight = mouseY - offsetY - navHeight / 2;

          // Prevent minHeight overflow (drawers.sharedState.frame.minHeight)
          const targetHeight =
            calculatedHeight <= minHeight ? minHeight : calculatedHeight;

          drawers.sharedState.frame.height = targetHeight + 'px';
        }
      },

      stopResizing() {
        state.resize.x = false;
        state.resize.y = false;
        window.removeEventListener('mousemove', methods.handleDragResize);
      },
    };

    const computedState = {};

    // If we are NOT in readonly mode and if we have a blocId,
    // then we want to update the bloc we the json is udpated.
    // Without blocId, we consider it the responsability of the
    // page using the editor
    if (!treeState.readonly && props.blocId) {
      watch(
        () => treeState.pageBuilderJson,
        debounce(async (prev: any, cur: any) => {
          console.log({
            prev: JSON.parse(JSON.stringify(prev)),
            cur: JSON.parse(JSON.stringify(cur)),
          });

          if (props.blocId && treeState.pageBuilderJson) {
            await methods.updateBlocContent(treeState.pageBuilderJson);
            iframe.uses.builderJson.methods.postUpdateMessage();
          }
        }, 400),
        { deep: true }
      );
    }

    // Deal with the target tree of the editor (we may have several trees)
    const sharedStates = useSharedStates();
    watch(
      () => sharedStates.sharedStates,
      () => {
        const editableTreeId = sharedStates.methods.editableTreeId();
        state.editableTreeId = editableTreeId;

        if (!editableTreeId) {
          return;
        }
      },
      {
        deep: true,
        immediate: true,
      }
    );

    return {
      drawers,
      iframe,
      drag,
      props,
      treeState,
      stateless,
      state,
      methods,
      computedState,
      screen,
    };
  },
});
</script>
<style lang="scss">
@import './../_pagebuilder.scss';
@import './_pagebuilder.scss';
</style>
