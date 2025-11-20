<template>
  <DPage>
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
  </DPage>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import cTitle from './_components/Title.vue';
import MyObservations from './_components/my-observations/Index.vue';
import FirstSteps from './_components/first-steps/Index.vue';
import ActiveChronicle from './_components/active-chronicle/Index.vue';
import Advertisement from './_components/advertisement/Index.vue';

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
    ActiveChronicle,
    Advertisement,
  },
  setup() {
    return {};
  },
});
</script>

<style lang="scss" scoped>
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
