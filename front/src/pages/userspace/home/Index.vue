<template>
  <DPage>
    <div class="fit column relative-position">
      <div
        v-if="observation.sharedState.loading"
        class="loading-overlay column items-center justify-center"
      >
        <q-spinner-dots size="48px" color="primary" />
        <div class="text-body2 text-grey-7 q-mt-md">Chargement de la chronique...</div>
      </div>

      <div class="col row">
        <div class="col-6 column">
          <div class="col column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Vos chroniques" />
              <MyObservations class="col" />
            </div>
          </div>
          <div class="col column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Centre d'aide" />
              <FirstSteps class="col" />
            </div>
          </div>
        </div>
        <div class="col-6 column">
          <div class="col column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Gestion de chronique" />
              <ActiveChronicle class="col" />
            </div>
          </div>
          <div class="col column q-pa-xs">
            <div class="box col column">
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
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 100;
  pointer-events: none;
}

.box {
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid $grey-5;
}
</style>
