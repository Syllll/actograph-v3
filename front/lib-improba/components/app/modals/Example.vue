<template>
  <DModal
    :title="'Titre'"
    :minWidth="'50vw'"
    :maxHeight="'30rem'"
    :triggerOpen="props.triggerOpen"
    @update:triggerOpen="$emit('update:triggerOpen', $event)"
    v-model:triggerClose="state.triggerClose"
  >
    <div class="fit q-pa-sm row justify-center">
      <DForm
        v-if="state.form"
        ref="formRef"
        class="col-12 col-md-8 col-lg-6 column q-gutter-y-sm"
        :errorInForm="state.errorInForm"
      >
      </DForm>
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

export default defineComponent({
  components: {},
  props: {
    triggerOpen: { type: Boolean, default: false },
  },
  emits: ['update:triggerOpen', 'refresh'],
  setup(props, context) {
    const formRef = ref(null);

    const stateless = {};
    const state = reactive({
      triggerClose: false,
      loading: false,
      errorInForm: '',
      form: null as any,
    });

    onMounted(() => {
      state.loading = false;
    });

    const methods = {
      submit: async () => {
        state.errorInForm = '';

        const validate = await (formRef as any).value.formRef.validate();
        if (!validate) {
          state.errorInForm = 'Bad entries detected in the form';
          return;
        }

        try {
          state.loading = true;
          /*const response = await adminUserService.create({
            roles: <any>[state.form.roles],
            username: state.form.username,
            password: state.form.password,
          });*/
          state.triggerClose = true;
          state.loading = false;
          context.emit('refresh');
        } catch (err: any) {
          state.loading = false;
          state.errorInForm =
            err.message ??
            err.response?.data?.message ??
            err.response?.message ??
            'Unkwown error';
          return;
        }
      },
    };

    watch(
      () => props.triggerOpen,
      (val, prev) => {
        if (val) {
          // Setup form object
          state.form = {
            username: '',
            password: '',
            roles: null,
          };
        }
      }
    );

    return { stateless, state, props, formRef, methods };
  },
});
</script>
