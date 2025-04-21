<template>
  <DPage>
    <div class="fit row">
      <div class="col-6 column">
        <div class="col-6 box-wrapper">
          <div class="box column">
            <cTitle class="col-auto" title="Mes observations" />
            <MyObservations class="col" />
          </div>
        </div>
        <div class="col-6 box-wrapper">
          <div class="box">
            <cTitle title="Premiers pas" />
            <FirstSteps />
          </div>
        </div>
      </div>
      <div class="col-6 column">
        <div class="col-6 box-wrapper">
          <div class="box">
            <cTitle title="Encart publicitaire" />
          </div>
        </div>
        <div class="col-6 box-wrapper">
          <div class="box">
            <cTitle title="A propos" />
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

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
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
