<template>
  <div :class="'fit row justify-center items-center'">
    <div class="fit relative-position" ref="canvasRef" style="overflow: hidden">
      <canvas
        :id="$props.canvasId"
        @mouseenter="$emit('canvasMouseEnter', $event)"
        @mouseleave="$emit('canvasMouseLeave', $event)"
        @mousemove="$emit('canvasMouseMove', $event)"
      >
      </canvas>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { nextTick } from 'process';
import { defineComponent, onDeactivated, onMounted, reactive, ref } from 'vue';

export default defineComponent({
  props: {
    canvasId: {
      type: String,
      required: false,
    },
    square: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: ['resize', 'canvasMouseEnter', 'canvasMouseMove', 'canvasMouseLeave'],
  setup(props, context) {
    const canvasRef = ref<any>(null);

    const resizeAction = () => {
      if (!canvasRef?.value) {
        return;
      }

      const parentElement = canvasRef.value.parentElement;
      if (!parentElement) {
        return;
      }

      const rect = parentElement.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const sideValue = Math.min(
        Math.floor(rect.width),
        Math.floor(rect.height)
      );

      //canvasRef.value.style.width = `${sideValue}px !important`;
      //canvasRef.value.style.height = `${sideValue}px !important`;
      canvasRef.value.style = `width: ${sideValue - 25}px !important; height: ${
        sideValue - 25
      }px !important`;
      context.emit('resize', sideValue);
    };

    const resizeEvent = () => {
      const parentElement = canvasRef.value.parentElement;
      if (!parentElement) {
        return;
      }

      const rect = parentElement.getBoundingClientRect();
      if (!rect) {
        return;
      }

      /*canvasRef.value.style.width = `${Math.floor(
        rect.width - 25
      )}px !important`;
      canvasRef.value.style.height = `${Math.floor(
        rect.height - 25
      )}px !important`;*/

      canvasRef.value.style = `width: ${Math.floor(
        rect.width - 5
      )}px !important; height: ${Math.floor(rect.height - 5)}px !important`;

      context.emit('resize');
    };

    onMounted(() => {
      const parentElement = canvasRef.value.parentElement;

      if (props.square) {
        resizeAction();

        // window.addEventListener('resize', resizeAction);
        new ResizeObserver(resizeAction).observe(parentElement);
      } else {
        // window.addEventListener('resize', resizeEvent);
        resizeEvent();
        new ResizeObserver(resizeEvent).observe(parentElement);
      }
    });

    onDeactivated(() => {
      //window.removeEventListener('resize', resizeAction);
      //window.removeEventListener('resize', resizeEvent);
    });

    return {
      canvasRef,
    };
  },
});
</script>

<style scoped lang="scss">
canvas {
  display: block;
  padding: 0px;
  border: 0px;
  margin: 0px;
  border-image-width: 0px;
  width: 100% !important;
  height: calc(100%) !important;
}
</style>
```
