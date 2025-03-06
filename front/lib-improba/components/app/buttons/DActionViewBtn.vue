<template>
  <DActionBtn
    icon="description"
    :tooltip="props.tooltip"
    :disabled="props.disabled"
  >
    <slot></slot>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import DActionBtn from './DActionBtn.vue';

export default defineComponent({
  components: {
    DActionBtn,
  },
  props: {
    disabled: { type: Boolean, default: false },
    tooltip: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    const i18n = useI18n();
    return {
      i18n,
      props,
    };
  },
});
</script>
