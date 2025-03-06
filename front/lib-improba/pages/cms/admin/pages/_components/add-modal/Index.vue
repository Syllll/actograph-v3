<template>
  <DModal
    title="Ajouter une page"
    :minWidth="'30vw'"
    :maxHeight="'20rem'"
    :triggerOpen="$props.triggerOpen"
    @update:triggerOpen="$emit('update:triggerOpen', $event)"
    v-model:triggerClose="state.triggerClose"
  >
    <div class="col">
      <div class="fit q-pa-sm row justify-center">
        <DForm
          v-if="state.form"
          ref="formRef"
          class="col-12 col-md-8 col-lg-6 column q-gutter-y-sm"
          :errorInForm="state.errorInForm"
        >
          <DFormInput label="Nom" v-model="state.form.name" />
          <DFormInput readonly label="URL" v-model="state.form.url" />
          <DFormInput
            type="select"
            label="Layout"
            clearable
            v-model="state.form.layout"
            :options="state.layouts.map((l: any) => {
              return {
                label: l.name,
                value: { id: l.id } ,
              };
            })"
          />
        </DForm>
      </div>
    </div>

    <template v-slot:layout-buttons>
      <div>
        <DCancelBtn class="q-mx-sm" @click="state.triggerClose = true" />
      </div>
      <div>
        <DSubmitBtn
          :loading="state.loading"
          class="q-mx-sm"
          @click="methods.submit"
        />
      </div>
    </template>
  </DModal>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, watch } from 'vue';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { adminBlocService } from '@lib-improba/services/cms/admin/blocs/index.service';
import { emit } from 'process';
import { IBloc } from '@lib-improba/services/cms/interface';

export default defineComponent({
  components: {},
  props: {
    triggerOpen: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:triggerOpen', 'created'],
  setup(props, { emit }) {
    const formRef = ref(null);

    const state = reactive({
      triggerClose: false,
      loading: false,
      errorInForm: '',
      layouts: [] as IBloc[],
      form: null as null | {
        name: string;
        url: string;
        layout: null | { id: number };
      },
    });

    onMounted(() => {
      state.loading = false;
    });

    const methods = {
      init: async () => {
        state.loading = false;
        state.errorInForm = '';
        state.form = {
          name: '',
          url: '',
          layout: null,
        };

        const layouts = await adminBlocService.findWithPagination(
          {
            limit: 99,
            offset: 0,
            orderBy: 'id',
            order: 'DESC',
          },
          {
            type: 'layout',
          }
        );

        state.layouts = layouts.results;
      },
      submit: async () => {
        state.errorInForm = '';

        if (!state.form) {
          throw new Error('Form is not defined');
        }

        const validate = await (formRef as any).value.formRef.validate();
        if (!validate) {
          state.errorInForm = 'Bad entries detected in the form';
          return;
        }

        try {
          state.loading = true;

          await adminPageService.create({
            name: state.form.name,
            url: state.form.url,
          });

          emit('created');

          state.loading = false;
        } catch (err: any) {
          console.error(err);
          state.loading = false;
          state.errorInForm =
            err.message ??
            err.response?.data?.message ??
            err.response?.message ??
            'Erreur inconnue';
          return;
        }

        state.loading = true;
        setTimeout(() => {
          state.loading = false;
          state.triggerClose = true;
        }, 1000);
      },
    };

    watch(
      () => props.triggerOpen,
      () => {
        methods.init();
      }
    );

    watch(
      () => state.form?.name,
      () => {
        if (!state.form) {
          return;
        }
        state.form.url = state.form.name
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
    );

    return { state, formRef, methods };
  },
});
</script>
