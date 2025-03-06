<template>
  <div
    class="col column bg-primary full-height"
    style="min-height: inherit !important"
  >
    <div id="global">
      <q-card>
        <q-card-section class="text-center">
          <img id="logo" src="logo-ateliom-noir.png" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <slot> </slot>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({});
</script>

<style lang="scss" scoped>
#global {
  width: 50%;
  margin: auto;
  margin-top: 2em;

  @media (max-width: $breakpoint-sm) {
    width: 100%;
  }

  #logo {
    width: 25%;

    @media (max-width: $breakpoint-sm) {
      width: 50%;
    }
  }
}
</style>
