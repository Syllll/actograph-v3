<template>
  <q-tab-panel
    :name="$props.name"
    :class="`
      text-pb-editor-text
      ${$props.bgColor ? 'bg-' + $props.bgColor : 'bg-transparent'}
      ${$props.noPadding ? 'no-padding' : ''}
    `"
  >
    <!-- <div class="text-h6">{{props.name}}</div>-->
    <slot></slot>
  </q-tab-panel>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  components: {},
  props: {
    name: {
      type: String,
      default: () => '',
    },
    noPadding: {
      type: Boolean,
      default: false,
    },
    bgColor: {
      type: String,
      default: null,
    },
  },
  setup(props) {
    return {};
  },
});
</script>

<style lang="scss" scoped>
.no-padding {
  padding: 0;
  &:deep() {
    .q-tab-panel {
      padding: 0;
    }
  }
}
</style>
