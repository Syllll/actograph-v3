<template>
  <q-tab-panel
    :name="props.name"
    :class="`${props.bgColor ? 'bg-' + props.bgColor : 'bg-secondary-medium'} ${
      props.noPadding ? 'q-pa-none' : ''
    }`"
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
    return {
      props,
    };
  },
});
</script>

<style lang="scss" scoped>
.no-padding {
  &:deep() {
    .q-field__before {
      padding: 0;
    }
  }
}
</style>
