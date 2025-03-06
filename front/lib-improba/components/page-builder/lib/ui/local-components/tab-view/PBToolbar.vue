<template>
  <div :class="`${!props.noScopedStyle ? 'scopedStyle' : 'noStyle'}`" no-caps>
    <q-toolbar
      :class="`bg-${$props.bgColor}`"
      :style="`${props.minHeight ? 'min-height: ' + props.minHeight : ''}`"
    >
      <slot> </slot>
    </q-toolbar>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  props: {
    noScopedStyle: {
      type: Boolean,
      default: false,
    },
    bgColor: {
      type: String,
      default: 'purple',
    },
    minHeight: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    return {
      props,
      tab: ref('mails'),
    };
  },
});
</script>

<style scoped lang="scss">
.scopedStyle {
  .q-toolbar {
    &:deep() {
      padding: 0px !important;

      .q-tab--active {
        background: var(--card);
      }

      .q-tab--inactive {
        background: var(--pb-editor-secondary-medium);
      }

      .q-tab__indicator {
        // visibility: hidden;
        height: 0.2rem;
      }
    }
  }
}
.noStyle {
  .q-toolbar {
    &:deep() {
      padding: 0px !important;

      .q-tab__indicator {
        // visibility: hidden;
        height: 0.2rem;
      }
    }
  }
}
</style>
