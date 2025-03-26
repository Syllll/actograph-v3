<template>
  <router-view />
  <UpdateModal v-model:trigger-open="state.showUpdateModal" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from 'vue';
import UpdateModal from '@components/update-modal/Index.vue';
import systemService from '@services/system/index.service';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: {
    UpdateModal,
  },
  setup() {
    const observation = useObservation({
      init: true,
    });

    const state = reactive({
      showUpdateModal: false,
    });

    onMounted(() => {
      systemService.onUpdateAvailable(async () => {
        const dialogResponse = await createDialog({
          title: 'Mise à jour disponible',
          message: 'Une mise à jour est disponible. Souhaitez-vous l\'installer ?',
          cancel: 'Non',
          ok: 'Oui',
          persistent: true,
        });
        if (!dialogResponse) {
          // Return and do nothing if the user clicks on cancel
          return;
        }
        state.showUpdateModal = true;
      });
      
      systemService.readyToCheckUpdates();
    });
    return {
      state,
      observation,
    };
  },
});
</script>
