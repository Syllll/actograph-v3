<template>
  <DPage>
    <div class="home-page-wrapper relative-position">
      <div
        v-if="observation.sharedState.loading"
        class="loading-overlay column items-center justify-center"
      >
        <q-spinner-dots size="48px" color="primary" />
        <div class="text-body2 text-grey-7 q-mt-md">Chargement de la chronique...</div>
      </div>

      <div class="fit row">
      <div class="col-6 column">
        <div class="col-6 box-wrapper">
          <div class="box column">
            <cTitle class="col-auto" title="Vos chroniques" />
            <MyObservations class="col" />
          </div>
        </div>
        <div class="col-6 box-wrapper">
          <div class="box column">
            <cTitle class="col-auto" title="Centre d'aide" />
            <FirstSteps class="col" />
          </div>
        </div>
      </div>
      <div class="col-6 column">
        <div class="col-6 box-wrapper">
          <div class="box column">
            <cTitle class="col-auto" title="Chronique active" />
            <ActiveChronicle class="col" />
          </div>
        </div>
        <div class="col-6 box-wrapper">
          <div class="box column">
            <cTitle class="col-auto" title="En savoir plus" />
            <Advertisement class="col" />
          </div>
        </div>
      </div>
    </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import cTitle from './_components/Title.vue';
import MyObservations from './_components/my-observations/Index.vue';
import FirstSteps from './_components/first-steps/Index.vue';
import ActiveChronicle from './_components/active-chronicle/Index.vue';
import Advertisement from './_components/advertisement/Index.vue';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
    ActiveChronicle,
    Advertisement,
  },
  setup() {
    const observation = useObservation();
    return {
      observation,
    };
  },
});
</script>

<style lang="scss" scoped>
.home-page-wrapper {
  position: relative;
  min-height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 100;
  pointer-events: none; /* Non bloquant : l'utilisateur peut voir le chargement */
}

.box-wrapper {
  padding: 0.2rem;
}

.box {
  width: 100%;
  height: 100%;
  // Add padding
  padding: 1rem;
  border-radius: 0.5rem;
  // Add a solid grey border
  border: 1px solid $grey-5;
}
</style>
