<template>
  <div class="fit row justify-center items-center">
    <DInnerLoading v-if="state.loading">
      Chargement de l'application...
    </DInnerLoading>
    <q-banner class="bg-danger text-white rounded" v-else-if="state.error">
      {{ state.error }}
    </q-banner>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@lib-improba/composables/use-auth';
import securityService from '@services/security/index.service';
import { useStartupLoading } from 'src/composables/use-startup-loading';

export default defineComponent({
  components: { EmptyLayout },
  setup() {
    const router = useRouter();
    const auth = useAuth(router);
    const startupLoading = useStartupLoading();

    const state = reactive({
      loading: true,
      error: null as string | null,
    });

    onMounted(async () => {
      const start = new Date();
      const timeout = 10000;
      let isServerRunning = false;

      while (
        !isServerRunning &&
        new Date().getTime() - start.getTime() < timeout
      ) {
        let result = null as string | null;
        try {
          result = await securityService.sayHi();
        } catch (error) {}
        if (result === 'hi') {
          isServerRunning = true;
        }
      }
      if (!isServerRunning) {
        state.error =
          "Erreur lors de l'initialisation de l'application, code=1";
        state.loading = false;
        return;
      }

      const localUserName = await securityService.getLocalUserName();

      try {
        await auth.methods.login(localUserName, localUserName.split('-')[1]);
      } catch (error) {
        state.error =
          "Erreur lors de l'initialisation de l'application, code=2";
        state.loading = false;
        return;
      }

      // If the application is running in electron mode, we need to check if there is an existing license on the pc
      // If not, we need to redirect to the choose-version page
      if (process.env.MODE === 'electron') {
        await startupLoading.methods.processLoadingAtStartup();
      }
    });

    return {
      auth,
      state,
    };
  },
});
</script>
