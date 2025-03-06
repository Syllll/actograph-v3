<template>
  <DPage
    ><PageBuilderEditor
      :builderVars="{ MESSAGE: 'toto' }"
      :builderStyle="{ colors: { primary: '#ff0000', text: '#3cfe63' } }"
      v-model="state.builderJSON"
    ></PageBuilderEditor
  ></DPage>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { PageBuilderEditor } from '@lib-improba/components/page-builder';
import builderJSON from '@lib-improba/components/page-builder/test.json';

export default defineComponent({
  components: { PageBuilderEditor },
  setup() {
    const state = reactive({
      builderJSON,
    });
    return { state };
  },
});
</script>
