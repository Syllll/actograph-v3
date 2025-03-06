<template>
  <template v-if="state.blocId">
    <cBloc :blocId="state.blocId" :builderVars="$props.builderVars" />
  </template>
  <template v-else>
    <div
      style="min-height: 150px"
      class="
        column
        items-center
        justify-center

        relative-position
        rounded-less

        border-neutral-high
        border-thicker
        border-dashed
      "
    >
      <div
        class="
          column
          items-center
          justify-center

          q-pa-sm
          rounded

          text-center
          text-accent-high

          bg-neutral-high-20
        "
      >
        Veuillez choisir un contenu de bloc
        <q-icon size="md" name="mdi-select-place" />
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, onBeforeMount } from 'vue';
import cBloc from './_Bloc.vue';
import { nextTick } from 'vue';
import { blocService } from '@lib-improba/services/cms/blocs/index.service';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';
import { IBloc } from '@lib-improba/services/cms/interface';

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
    blocId: {
      type: Number,
      required: false,
      builderOptions: {
        options: async () => {
          const blocs = await adminBlocService.findWithPagination({
            offset: 0,
            limit: 20,
            orderBy: 'id',
            order: 'DESC',
          }, {
            type: 'others'
          });

          return blocs.results.map((bloc: IBloc) => ({
            label: bloc.name,
            value: bloc.id,
          }));
        }
      }
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    category: undefined,
    name: 'Bloc',
    description: 'Un bloc',
  },
  setup(props, context) {
    const state = reactive({
      blocId: null as null | number,
    });

    watch(
      () => props.blocId,
      () => {
        state.blocId = null;

        if (props.blocId) {
            state.blocId = props.blocId ?? null;
        }
      }, {
        immediate: true
      }
    )

    return {
      props,
      state,
    };
  },
});
</script>
