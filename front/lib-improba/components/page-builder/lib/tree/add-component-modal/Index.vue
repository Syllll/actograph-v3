<template>
  <DModal
    title="Choose a component to insert"
    :minWidth="'60vw'"
    :maxHeight="'35rem'"
    :triggerOpen="props.triggerOpen"
    @update:triggerOpen="$emit('update:triggerOpen', $event)"
    v-model:triggerClose="state.triggerClose"
  >
    <div class="fit q-pa-md column q-gutter-y-md">
      <div class="col-auto row justify-center">
        <DSearchInput
          v-model="state.search"
          style="width: 20rem"
          autofocus
          placeholder="Enter search text"
        />
      </div>
      <DScrollArea class="col">
        <CompoList
          :myTreeId="props.myTreeId"
          :search="state.search"
          v-model:selectedComponentName="state.selectedComponentName"
        />
      </DScrollArea>
    </div>
    <template v-slot:layout-buttons>
      <div>
        <DCancelBtn class="q-mx-sm" @click="state.triggerClose = true" />
      </div>
      <div>
        <DSubmitBtn
          label="Insert"
          :disable="!state.selectedComponentName"
          :loading="state.loading"
          class="q-mx-sm"
          @click="methods.submit"
        />
      </div>
    </template>
  </DModal>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  watch,
  computed,
} from 'vue';
import { useTree } from '../index';
import { notify } from './../../utils/notify.utils';
import CompoList from './../../ui/local-components/list-check-or-drag/Index.vue';
import { getCurrentType } from '../../ui/use-iframe';
import { ESources } from '../../ui/interfaces/iframe.interface';
import { useDragCard } from '../../ui/local-components/list-check-or-drag/use-drag-card';
import { useDrawers } from '../../ui/use-drawers';

export default defineComponent({
  components: {
    CompoList,
  },
  props: {
    triggerOpen: { type: Boolean, default: false },
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
  emits: ['update:triggerOpen', 'refresh'],
  setup(props, context) {
    const tree = useTree(props.myTreeId);
    const treeState = tree.sharedState;
    const actions = tree.methods.actions;

    const drag = useDragCard();
    const drawers = useDrawers(props.myTreeId);

    const formRef = ref(null);

    const stateless = {};
    const state = reactive({
      triggerClose: false,
      loading: false,
      search: '',
      selectedComponentName: '',
      availComponents: [] as any[],
    });

    const computedState = {};

    onMounted(() => {
      state.loading = false;
    });

    const methods = {
      submit: () => {
        const toAdd = {
          targetId: props.parentId,
          component: state.selectedComponentName,
          slot: props.slotName,
          treeId: props.myTreeId,
        };

        actions.add(toAdd);

        if (getCurrentType() === ESources.iframe) {
          drag.sharedState.droppedComponent = toAdd;
        }

        notify({
          message: `Component ${state.selectedComponentName} added successfully`,
          color: 'positive',
          position: 'top',
        });

        state.triggerClose = true;
      },
    };

    watch(
      () => props.triggerOpen,
      () => {
        if (props.triggerOpen) {
          drawers.methods.toggleDrawerState('show', null, false);
        }
      }
    );

    return {
      stateless,
      state,
      props,
      formRef,
      methods,
      treeState,
      computedState,
    };
  },
});
</script>
