<template>
  <div class="fit">
    <div v-if="state.loading" class="fit column items-center justify-center">
      <q-spinner color="primary" size="48px" />
      <div class="text-body2 q-mt-md text-grey">{{ $t('observation.popupLoading') }}</div>
    </div>
    <div v-else-if="state.error" class="fit column items-center justify-center">
      <q-icon name="error" size="48px" color="negative" />
      <div class="text-body1 q-mt-md text-negative">{{ state.error }}</div>
    </div>
    <VideoPlayer v-else-if="componentName === 'video'" />
    <ButtonsSideIndex v-else-if="componentName === 'buttons'" />
    <div v-else class="fit column items-center justify-center">
      <q-icon name="error" size="48px" color="negative" />
      <div class="text-body1 q-mt-md">{{ $t('observation.popupComponentNotFound') }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import VideoPlayer from './_components/VideoPlayer.vue';
import ButtonsSideIndex from './_components/buttons-side/Index.vue';
import { useObservation } from 'src/composables/use-observation';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'PopupView',

  components: {
    VideoPlayer,
    ButtonsSideIndex,
  },

  props: {
    component: {
      type: String,
      default: '',
    },
  },

  setup(props) {
    const route = useRoute();
    const { t } = useI18n();
    const observation = useObservation();
    const componentName = computed(() => props.component || '');

    const state = reactive({
      loading: false,
      error: '' as string,
    });

    onMounted(async () => {
      const observationId = route.query.observationId;
      if (!observationId) {
        state.error = t('observation.popupMissingChronicleId');
        return;
      }

      const id = Number(observationId);
      if (!Number.isFinite(id) || id <= 0) {
        state.error = t('observation.popupInvalidChronicleId');
        return;
      }

      state.loading = true;
      try {
        await observation.methods.loadObservation(id);
      } catch (error) {
        console.error('Erreur lors du chargement de la chronique:', error);
        state.error = t('observation.popupChronicleLoadError');
      } finally {
        state.loading = false;
      }
    });

    return {
      componentName,
      state,
    };
  },
});
</script>
