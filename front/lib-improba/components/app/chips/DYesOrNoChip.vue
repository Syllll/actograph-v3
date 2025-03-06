<template>
  <DChip
    :color="computedState.yesOrNoColor"
    :class="
      'q-pa-xs q-px-sm non-selectable' + (props.dense ? ' no-icon-margin' : '')
    "
    rounded
  >
    {{ computedState.yesOrNo }}
  </DChip>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';

import { DChip } from 'src/../lib-improba/components/app';

export default defineComponent({
  components: {
    DChip,
  },
  props: {
    booleanValue: {
      type: Boolean,
      required: true,
    },
    dense: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const computedState = reactive({
      yesOrNo: computed(() => (props.booleanValue ? 'Oui' : 'Non')),
      yesOrNoColor: computed(() =>
        props.booleanValue ? 'success-medium' : 'neutral-medium'
      ),
    });

    return {
      props,
      computedState,
    };
  },
});
</script>

<style scoped lang="scss">
.no-icon-margin {
  &:deep() {
    .q-chip__icon {
      margin: 0 !important;
    }
  }
}
</style>
