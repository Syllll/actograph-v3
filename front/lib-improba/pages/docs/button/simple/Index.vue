<template>
  <div class="column full-width">
    <div class="col-auto column full-width">
      <div class="col-auto text-h6 q-pb-sm">Boutons simples</div>
      <div class="col-auto row full-width q-gutter-x-sm">
        <DBtn label="DBtn" />
        <DCancelBtn label="DCancelBtn" />
        <DSubmitBtn label="DSubmitBtn" />
      </div>
    </div>
    <div class="col-auto column full-width">
      <div class="col-auto text-h6 q-pb-sm q-pt-md">Boutons d'action</div>
      <div class="col-auto row full-width q-gutter-x-sm">
        <DActionBtn icon="add" />
        <DActionCloseBtn />
        <DActionArchiveBtn />
        <DActionViewBtn tooltip="Tooltip" />
        <DActionRemoveBtn />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  components: {},
  setup() {},
});
</script>
