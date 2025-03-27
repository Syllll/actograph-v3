<template>
  <DPage>
    <div class="fit column">
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

export default defineComponent({
  components: {
    ButtonsSideIndex,
    ReadingsSideIndex,
    ObservationToolbar,
  },

  setup() {
    const state = reactive({
      splitterModel: 40,
    });

    return {
      state,
    };
  },
});
</script>
