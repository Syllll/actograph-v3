<template>
  <DPage>
    <div class="fit column relative-position">
      <div
        v-if="observation.sharedState.loading"
        class="loading-overlay column items-center justify-center"
      >
        <q-spinner-dots size="48px" color="primary" />
        <div class="text-body2 text-grey-7 q-mt-md">
          {{ $t('homePage.loadingChronicle') }}
        </div>
      </div>

      <!-- ===== Layout A: No chronicle loaded ===== -->
      <template v-if="!hasCurrentObservation">
        <div class="col-auto q-pa-xs">
          <WelcomeHero
            :is-cloud-authenticated="cloud.sharedState.isAuthenticated"
            @create="chronicleActions.createObservation"
            @import="chronicleActions.importObservation"
            @cloud="chronicleActions.openCloud"
            @load-example="chronicleActions.loadExample"
          />
        </div>

        <div class="col row" style="min-height: 0">
          <div class="col-7 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" :title="$t('homePage.yourChronicles')" />
              <MyObservations class="col" />
            </div>
          </div>
          <div class="col-5 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" :title="$t('homePage.helpCenter')" />
              <FirstSteps class="col" />
            </div>
          </div>
        </div>
      </template>

      <!-- ===== Layout B: Chronicle loaded ===== -->
      <template v-else>
        <div class="col-auto q-pa-xs">
          <div class="box">
            <cTitle :title="$t('homePage.activeChronicle')" />
            <ActiveChronicle
              :is-cloud-authenticated="cloud.sharedState.isAuthenticated"
              @cloud="chronicleActions.openCloud"
            />
          </div>
        </div>

        <div class="col row" style="min-height: 0">
          <div class="col-7 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" :title="$t('homePage.yourChronicles')" />
              <MyObservations class="col" />
            </div>
          </div>
          <div class="col-5 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" :title="$t('homePage.helpCenter')" />
              <FirstSteps class="col" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue';
import cTitle from './_components/Title.vue';
import MyObservations from './_components/my-observations/Index.vue';
import FirstSteps from './_components/first-steps/Index.vue';
import ActiveChronicle from './_components/active-chronicle/Index.vue';
import WelcomeHero from './_components/welcome-hero/Index.vue';
import { useObservation } from 'src/composables/use-observation';
import { useCloud } from 'src/composables/use-cloud';
import { useChronicleActions } from 'src/composables/use-chronicle-actions';

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
    ActiveChronicle,
    WelcomeHero,
  },
  setup() {
    const observation = useObservation();
    const cloud = useCloud();
    const chronicleActions = useChronicleActions();

    onMounted(async () => {
      await cloud.methods.init();
    });

    const hasCurrentObservation = computed(
      () => !!observation.sharedState.currentObservation,
    );

    return {
      observation,
      cloud,
      hasCurrentObservation,
      chronicleActions,
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
