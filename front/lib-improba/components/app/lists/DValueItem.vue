<template>
  <DItem noPadding class="row q-py-none">
    <DItemSection class="col-6 text-weight-bold">
      {{ props.label }}
    </DItemSection>
    <DItemSection class="col-6">
      <div class="fit row"><slot></slot></div>
    </DItemSection>
  </DItem>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return { props };
  },
});
</script>
