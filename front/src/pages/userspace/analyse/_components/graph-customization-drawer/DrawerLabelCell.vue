<template>
  <div class="label-cell" :class="textClass">
    <span ref="textEl" class="label-text ellipsis">{{ text }}</span>
    <q-tooltip v-if="isTruncated">{{ text }}</q-tooltip>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUpdated, onUnmounted, nextTick } from 'vue';

export default defineComponent({
  name: 'DrawerLabelCell',
  props: {
    text: {
      type: String,
      required: true,
    },
    textClass: {
      type: [String, Array, Object],
      default: '',
    },
  },
  setup(props) {
    const textEl = ref<HTMLElement | null>(null);
    const isTruncated = ref(false);
    let resizeObserver: ResizeObserver | null = null;

    const updateTruncation = () => {
      const el = textEl.value;
      if (!el) {
        isTruncated.value = false;
        return;
      }
      isTruncated.value = el.scrollWidth > el.clientWidth + 1;
    };

    onMounted(() => {
      nextTick(() => {
        updateTruncation();
        if (typeof ResizeObserver === 'undefined' || !textEl.value) {
          return;
        }
        resizeObserver = new ResizeObserver(() => {
          updateTruncation();
        });
        resizeObserver.observe(textEl.value);
      });
    });

    onUpdated(() => {
      nextTick(updateTruncation);
    });

    onUnmounted(() => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    });

    watch(
      () => props.text,
      () => {
        nextTick(updateTruncation);
      }
    );

    return {
      textEl,
      isTruncated,
    };
  },
});
</script>
