<template>
  <template v-if="state.pageBlocId">
    <cBloc :blocId="state.pageBlocId" :builderVars="$props.builderVars" />
  </template>
  <template v-else>
    <div
      style="min-height: 150px"
      class="column items-center justify-center relative-position border-neutral-high border-thicker border-dashed rounded-less"
    >
      <div
        class="column items-center justify-center text-center text-accent-high bg-neutral-high-20 q-pa-sm rounded"
      >
        Page content
        <q-icon size="md" name="mdi-select-place" />
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, onBeforeMount } from 'vue';
import cBloc from './../_Bloc.vue';

export default defineComponent({
  components: {
    cBloc,
  },
  props: {
    builderVars: {
      type: Object,
      required: false,
      builderOptions: { hide: true },
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    category: 'Layout',
    name: 'LayoutPageContent',
    description: 'Le contenu de la page, à insérer dans un layout',
  },
  setup(props, context) {
    const state = reactive({
      pageBlocId: null as null | number,
    });

    const pageBlocId = props.builderVars?._PAGE_CONTENT_BLOC_ID;
    state.pageBlocId = pageBlocId;

    return {
      props,
      state,
    };
  },
});
</script>
