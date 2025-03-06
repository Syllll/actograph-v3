<template>
  <div class="row q-gutter-md">
    <DCard title="Titre" class="col-5">
      <template v-slot:header-actions>
        <DBtn label="Je suis un bouton" />
        <DBtn icon="close" />
      </template>
      Contenu de la carte
    </DCard>

    <DCard innerHeader title="Titre" class="col-5">
      <template v-slot:inner-header-actions>
        <DBtn label="Je suis un bouton" />
        <DBtn icon="close" />
      </template>
      Contenu de la carte
    </DCard>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {},
});
</script>
