<template>
  <router-view />
  <UpdateModal v-model:trigger-open="state.showUpdateModal" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from 'vue';
import UpdateModal from '@components/update-modal/Index.vue';
import systemService from '@services/system/index.service';
export default defineComponent({
  components: {
    UpdateModal,
  },
  setup() {
    const state = reactive({
      showUpdateModal: false,
    });

    onMounted(() => {
      systemService.onUpdateAvailable(() => {
        state.showUpdateModal = true;
      });
      systemService.readyToCheckUpdates();
    });
    return {
      state,
    };
  },
});
</script>
