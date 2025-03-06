<template>
  <DModal
    :title="`Create user`"
    :minWidth="'50vw'"
    :maxHeight="'45rem'"
    :triggerOpen="props.triggerOpen"
    @update:triggerOpen="$emit('update:triggerOpen', $event)"
    v-model:triggerClose="state.triggerClose"
  >
    <div class="col">
      <div class="fit q-pa-sm row justify-center">
        <DForm
          ref="formRef"
          class="col-12 col-md-8 col-lg-6 column q-gutter-y-sm"
          :errorInForm="state.errorInForm"
        >
          <d-form-input
            :label="`Username`"
            v-model="state.form.username"
            :rules="[...rules.email]"
          />
          <d-form-input
            :label="`Password`"
            v-model="state.form.password"
            :rules="[...rules.password]"
          />
          <d-form-input
            type="options"
            :label="`Roles`"
            v-model="state.form.roles"
            :options="['user', 'admin']"
            :rules="[...rules.exist]"
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
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { useRules } from '@lib-improba/composables/use-rules';
import { useI18n } from 'vue-i18n';
import { adminUserService } from '@services/users/admin/admin-user.service';
import { date } from 'quasar';

export default defineComponent({
  components: {},
  props: {
    triggerOpen: { type: Boolean, default: false },
  },
  emits: ['update:triggerOpen', 'refresh'],
  setup(props, context) {
    const formRef = ref(null);
    const rules = useRules();
    const i18n = useI18n();

    const stateless = {};
    const state = reactive({
      triggerClose: false,
      loading: false,
      errorInForm: '',
      form: {
        username: '',
        password: '',
        roles: null,
      },
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
          const response = await adminUserService.create({
            roles: <any>[state.form.roles],
            username: state.form.username,
            password: state.form.password,
          });

          state.triggerClose = true;
          state.loading = false;
          context.emit('refresh');
        } catch (err: any) {
          console.error(err);
          if (err.response?.data?.message == 'double username') {
            state.errorInForm = i18n.t('admin.users.addUser.doubleUsername');
          } else {
            console.log('response : ', err.response?.data?.message);
            state.loading = false;
            state.errorInForm =
              err.message ??
              err.response?.data?.message ??
              err.response?.message ??
              'Unkwown error';
          }
          state.loading = false;
          return;
        }
      },
    };

    return { stateless, state, props, formRef, methods, rules, i18n };
  },
});
</script>
