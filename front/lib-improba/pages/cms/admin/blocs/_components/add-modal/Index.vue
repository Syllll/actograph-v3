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
          <DFormInput type="select" label="Type" v-model="state.form.type" :rules="rules.exist" :options="
            // Convert the BlocTypeEnum into an array with label and value
            Object.values(BlocTypeEnum).map((type) => ({
              label: type,
              value: type,
            }))
          " />
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
import { useRules } from 'src/../lib-improba/composables/use-rules';
import { BlocTypeEnum } from '@lib-improba/services/cms/interface';

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
    const rules = useRules();

    const formRef = ref(null);

    const state = reactive({
      triggerClose: false,
      loading: false,
      errorInForm: '',
      form: null as null | {
        name: string;
        type: null | BlocTypeEnum;
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
          type: null as null | BlocTypeEnum,
        };
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

          await adminBlocService.create({
            name: state.form.name,
            type: <BlocTypeEnum>state.form.type,
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
      }
    );

    return { state, formRef, methods, rules, BlocTypeEnum };
  },
});
</script>
