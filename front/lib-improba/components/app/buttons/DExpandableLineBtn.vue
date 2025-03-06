<template>
  <q-btn
    round
    dense
    size="xs"
    color="white"
    text-color="black"
    :icon="props.expand ? 'mdi-menu-up' : 'mdi-menu-down'"
    no-caps
  >
    <slot></slot>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    tooltip: {
      type: String,
      default: '',
    },
    expand: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const i18n = useI18n();
    return {
      props,
      i18n,
    };
  },
});
</script>
