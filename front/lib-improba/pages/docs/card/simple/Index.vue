<template>
  <div class="column q-gutter-md">
    <DCard title="Titre">
      <DCardSection title="Titre section1"> Section 1 </DCardSection>
      <DCardSection title="Titre section 2"> Section 2 </DCardSection>
    </DCard>

    <DCard innerHeader title="Titre">
      <DCardSection> Section 1 </DCardSection>
      <DCardSection> Section 2 </DCardSection>
    </DCard>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {},
});
</script>
