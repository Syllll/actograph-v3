<template>
  <DModal
    title="Mise à jour disponible"
    :minWidth="'50vw'"
    :maxHeight="'30rem'"
    persistent
    :triggerOpen="$props.triggerOpen"
    @update:triggerOpen="$emit('update:triggerOpen', $event)"
    v-model:triggerClose="state.triggerClose"
  >
    <DScrollArea class="fit q-pa-sm">
      <div v-if="!state.updateDownloaded" class="column items-center">
        <p>Une mise à jour est disponible. Téléchargement en cours...</p>
        <DProgressBar
          color="accent"
          :value="state.progress"
          :label="state.progressPercentage"
          style="width: 10rem"
        />
      </div>
      <div v-else>
        <p>
          Mise à jour téléchargée. Veuillez redémarrer l'application pour
          l'installer.
        </p>
      </div>

      <div v-if="state.error">
        <p>
          Une erreur est survenue lors du téléchargement de la mise à jour.
          Veuillez réessayer.
        </p>
        <p>{{ state.error.message }}</p>
      </div>
    </DScrollArea>

    <template v-slot:layout-buttons>
      <div>
        <!--<DCancelBtn
          label="Annuler"
          class="q-mx-sm"
          @click="state.triggerClose = true"
        />-->
        <DSubmitBtn
          label="Redémarrer et installer"
          :disabled="!state.updateDownloaded"
          class="q-mx-sm"
          @click="methods.submit"
        />
      </div>
    </template>
  </DModal>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, watch } from 'vue';
import systemService from '@services/system/index.service';

export default defineComponent({
  props: {
    triggerOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:triggerOpen'],
  setup(props) {
    const state = reactive({
      showModal: false,
      progress: 0.0,
      progressPercentage: '0.00%',
      updateDownloaded: false,
      error: null as any,
      triggerClose: false,
      initialized: false,
    });

    const methods = {
      init: async () => {
        if (state.initialized) {
          return;
        }

        systemService.onUpdateDownloadProgress((data) => {
          const percent = data.percent.toFixed(2);
          state.progress = percent / 100;
          state.progressPercentage = `${percent}%`;
          console.info(state.progress, state.progressPercentage);
        });
        systemService.onUpdateDownloaded(() => {
          state.updateDownloaded = true;
          console.info('Update downloaded');
        });
        systemService.onUpdateError((error) => {
          state.error = error;
          console.error('Error while downloading update', error);
        });

        state.initialized = true;

        systemService.downloadUpdate();
      },
      submit: async () => {
        await systemService.quitAndInstallUpdate();
      },
    };

    onMounted(() => {});

    watch(
      () => props.triggerOpen,
      (newVal) => {
        if (newVal) {
          methods.init();
        }
      }
    );

    return {
      state,
      methods,
    };
  },
});
</script>

<style scoped lang="scss"></style>
