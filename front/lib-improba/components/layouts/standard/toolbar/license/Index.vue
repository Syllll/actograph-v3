<template>
  <div class="row">
    <template v-if="isProfessionalAccess">
      <License />
    </template>
    <template v-else-if="isStudentAccess">
      <Student />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useLicense } from 'src/composables/use-license';
import License from './License.vue';
import Student from './Student.vue';

export default defineComponent({
  components: {
    License,
    Student,
  },
  setup(props) {
    const quasar = useQuasar();
    const router = useRouter();
    const { isProfessionalAccess, isStudentAccess } = useLicense();

    const stateless = {
      quasar,
    };

    const computedState = reactive({
      enable: computed(() => {
        // const currentRoleStr = currentRole();
        return true;
      }),
    });

    const methods = {};

    return {
      stateless,
      computedState,
      methods,
      screen: quasar.screen,
      isProfessionalAccess,
      isStudentAccess,
    };
  },
});
</script>
