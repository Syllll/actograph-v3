<template>
  <DPage
    ><PageBuilderViewer
      :builderVars="{ MESSAGE: 'toto' }"
      :builderStyle="{ colors: { primary: '#ff0000' } }"
  /></DPage>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageBuilderViewer } from '@lib-improba/components/page-builder';

export default defineComponent({
  components: { PageBuilderViewer },
  setup() {
    return {};
  },
});
</script>
