<template>
  <div
    v-if="!treeState.readonly"
    class="column justify-center items-center q-ma-xs all-pointer-events rounded smooth"
  >
    <div class="row full-width justify-center">
      <template v-if="drag.sharedState.dragElement">
        <DropZone
          style="min-height: 2.5rem !important; min-width: 2.5rem !important"
          @drop="methods.dropped"
        />
      </template>
      <template v-else>
        <!-- ? ADD COMPONANT MODAL -->
        <q-btn
          class="all-pointer-events fit col smooth rounded-less not-hover:bg-pb-editor-primary-90 hover:bg-pb-editor-primary-low"
          flat
          dense
          icon="add"
          @click="
            methods.openModal();
            $event.stopPropagation();
          "
        >
          <AddComponentModal
            v-model:triggerOpen="state.triggerOpenAddModal"
            :parentId="$props.parentId"
            :slotName="$props.slotName"
            :myTreeId="$props.myTreeId"
          />
          <q-tooltip v-if="$props.slotName">
            Slot name: {{ $props.slotName }}
          </q-tooltip>
        </q-btn>

        <!-- ? PASTE COPIED NODE -->
        <q-btn
          :disable="treeState.copiedNode?.id === $props.parentId"
          class="all-pointer-events fit smooth overflow-hidden rounded-less not-hover:bg-pb-editor-neutral-70 hover:bg-pb-editor-accent-90"
          :class="{
            'width-0 q-pa-none': !treeState.copiedNode,
            'width-20': treeState.copiedNode,
          }"
          flat
          dense
          icon="content_paste"
          @click="
            methods.paste();
            $event.stopPropagation();
          "
        >
          <q-tooltip v-if="$props.slotName">
            <template v-if="treeState.copiedNode?.id === $props.parentId">
              Cannot paste to itself
            </template>
            <template v-else>
              Paste copied content to slot: {{ $props.slotName }}
            </template>
          </q-tooltip>
        </q-btn>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from 'vue';
import { useTree } from './../use-tree';
import { useDragCard } from './../../ui/local-components/list-check-or-drag/use-drag-card';
import AddComponentModal from './../add-component-modal/Index.vue';
import DropZone from './DropZone.vue';
import { notify } from './../../utils/notify.utils';
import { getCurrentType } from '../../ui/use-iframe';
import { ESources } from '../../ui/interfaces/iframe.interface';

export default defineComponent({
  name: 'EmptySlot',
  components: {
    AddComponentModal,
    DropZone,
  },
  props: {
    slotName: {
      type: String,
      required: false,
      default: 'default',
    },
    parentId: {
      type: Number,
      required: true,
    },
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: [],
  setup(props, context) {
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;
    const actions = tree.methods.actions;
    const drag = useDragCard();

    const state = reactive({
      triggerOpenAddModal: false,
    });

    const methods = {
      paste: () => {
        actions.paste({
          treeId: props.myTreeId,
          targetId: props.parentId,
          nodeToBePasted: treeState.copiedNode,
        });
      },
      openModal: () => {
        state.triggerOpenAddModal = true;
      },
      dropped: (compoName: string) => {
        const toAdd = {
          targetId: props.parentId,
          component: compoName,
          slot: props.slotName,
          treeId: props.myTreeId,
        };

        if (getCurrentType() === ESources.iframe) {
          drag.sharedState.droppedComponent = toAdd;
        }

        actions.add(toAdd);

        notify({
          message: `Component ${compoName} added successfully`,
          color: 'positive',
          position: 'top',
        });
      },
    };

    return {
      methods,
      state,
      treeState,
      drag,
    };
  },
});
</script>

<style scoped lang="scss">
.btn {
  margin: 0.2rem;
}
</style>
