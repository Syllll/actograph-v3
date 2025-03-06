<template>
  <div class="row items-center">
    <DGoBackBtn
      v-if="state.previousUrl"
      @click="router.push(<any>state.previousUrl)"
    />
    <q-space />
    <div class="q-px-sm">
      <div class="row items-center justify-center">
        <ShortcutAction />
        <DrawerAction />
        <ResizeAction />

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useRouter } from 'vue-router';
import { defineComponent, reactive } from 'vue';

import ShortcutAction from '@lib-improba/components/page-builder/lib/ui/editor/drawers/components/ShortcutAction.vue';
import DrawerAction from '@lib-improba/components/page-builder/lib/ui/editor/drawers/components/DrawerAction.vue';
import ResizeAction from '@lib-improba/components/page-builder/lib/ui/editor/drawers/components/ResizeAction.vue';

export default defineComponent({
  components: {
    ShortcutAction,
    DrawerAction,
    ResizeAction
  },
  props: {
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: ['resize'],
  setup(props, { emit }) {
    const router = useRouter();

    const state = reactive({
      previousUrl: router.currentRoute.value.query.previousUrl,
    });

    const methods = {
    }

    return {
      props,
      router,
      state,
      methods
    };
  },
});
</script>
