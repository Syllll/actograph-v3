<template>
  <DCard v-if="state.page" title="Général" bgColor="secondary-lower">
    <template v-slot:header-actions>
      <DActionBtn
        v-if="computedState.edited.value"
        icon="refresh"
        @click="$emit('refresh')"
      />
      <DActionBtn
        v-if="computedState.edited.value"
        color="accent-medium"
        icon="save"
        @click="methods.save"
      />
    </template>

    <DFormInput label="Nom" v-model="state.page.name" />
    <DFormInput label="Url" v-model="state.page.url" readonly />
    <DFormInput
      label="Layout"
      type="select"
      clearable
      :modelValue="state.page.layout?.id ?? null"
      @update:model-value="(event: any) => {
          if (!event) {
            state.page.layout = null;
            return;
          }

          state.page.layout = {
            id: event,
          };
        }"
      :options="state.layoutOptions"
    />
    <DFormInput
      label="Statut"
      type="select"
      :modelValue="state.page.status"
      @update:modelValue="state.page.status = $event"
      :options="[
        { label: 'Publié', value: 'published' },
        { label: 'Brouillon', value: 'draft' },
      ]"
    />
    <div class="text-center q-mt-md">
      <DSubmitBtn
        v-if="computedState.edited.value"
        class="q-mx-"
        label="Sauvegarder"
        icon="save"
        @click="methods.save"
      />
    </div>
  </DCard>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, computed, watch } from 'vue';
import { extend } from 'quasar';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';
import { IPage } from '@lib-improba/services/cms/interface';
import DSubmitBtn from '@lib-improba/components/app/buttons/DSubmitBtn.vue';

export default defineComponent({
  components: {},
  props: {
    page: {
      type: Object,
      required: true,
    },
  },
  emits: ['refresh', 'edited'],
  setup(props, { emit }) {
    const state = reactive({
      layoutOptions: [] as { label: string; value: number }[],
      page: null as null | IPage,
    });

    const computedState = {
      edited: computed(() => {
        const initPageStr = JSON.stringify(props.page);
        const pageStr = JSON.stringify(state.page);
        return initPageStr !== pageStr;
      }),
    };

    const methods = {
      save: async () => {
        if (!state.page) {
          throw new Error('Page not found');
        }

        await adminPageService.update({
          id: state.page.id,
          name: state.page.name,
          layout: state.page.layout
            ? {
                id: state.page.layout.id,
              }
            : null,
          status: state.page.status,
        });
        emit('refresh');
      },
    };

    onMounted(async () => {
      const r = await adminBlocService.findWithPagination(
        {
          offset: 0,
          limit: 999,
          orderBy: 'id',
          order: 'DESC',
        },
        {
          type: 'layout',
          status: 'published',
        }
      );
      const layouts = r.results;
      state.layoutOptions = layouts.map((l) => ({
        label: l.name,
        value: l.id,
      }));
    });

    watch(
      () => props.page,
      (newVal: any) => {
        if (!newVal) return;

        state.page = extend(true, {}, newVal);
      },
      { immediate: true }
    );

    watch(
      () => computedState.edited.value,
      (val) => {
        emit('edited', val);
      }
    );

    return {
      state,
      computedState,
      methods,
    };
  },
});
</script>
