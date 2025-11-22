<template>
  <DPage>
    <div class="fit column">
      <!-- Video player section (always shown in chronometer mode, or if video is loaded) -->
      <div v-if="observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath" class="col-auto">
        <VideoPlayer />
      </div>
      
      <div class="col">
        <!-- Main area of the page with the splitter -->
        <q-splitter
          v-model="state.splitterModel"
          class="fit"
          :limits="[20, 80]"
          reverse
        >
          <template v-slot:before>
            <ButtonsSideIndex />
          </template>
          <template v-slot:separator>
            <q-avatar
              color="accent"
              text-color="white"
              size="md"
              icon="drag_indicator"
            />
          </template>
          <template v-slot:after>
            <ReadingsSideIndex />
          </template>
        </q-splitter>
      </div>
      <div class="col-auto">
        <!-- Bottom of the page, with the observation tool bar: play/pause, stop controls. -->
        <ObservationToolbar />
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import ButtonsSideIndex from './_components/buttons-side/Index.vue';
import ReadingsSideIndex from './_components/readings-side/Index.vue';
import ObservationToolbar from './_components/ObservationToolbar.vue';
import VideoPlayer from './_components/VideoPlayer.vue';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: {
    ButtonsSideIndex,
    ReadingsSideIndex,
    ObservationToolbar,
    VideoPlayer,
  },

  setup() {
    const observation = useObservation();
    
    const state = reactive({
      splitterModel: 40,
    });

    return {
      observation,
      state,
    };
  },
});
</script>
