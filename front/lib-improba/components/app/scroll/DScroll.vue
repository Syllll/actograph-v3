<template>
  <q-range
    :step="0.01"
    :class="`${noPadding ? 'noPadding' : ''}`"
    drag-only-range
    thumb-color="transparent"
    v-model="state.dragRange"
    :style="{
      visibility: state.dragRangeMiddle.max === 50 ? 'hidden' : 'visible',
    }"
    :min="stateless.minRange"
    :max="stateless.maxRange"
    @update:modelValue="
      emit('update:modelValue', computedState.actualPosition.value)
    "
    @change="emit('update:modelValue', computedState.actualPosition.value)"
  />
</template>

<script lang="ts">
import { defineComponent, computed, reactive, watch } from 'vue';

export default defineComponent({
  props: {
    scale: {
      type: Number,
      required: true,
      default: () => 1,
    },
    noPadding: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: ['update:modelValue', 'update:min', 'update:max'],
  setup(props, ctx) {
    const stateless = {
      minRange: 0,
      maxRange: 100,
    };
    const state = reactive({
      dragRange: {
        min: 0,
        max: 100,
      },
      dragRangeMiddle: {
        min: 50,
        max: 50,
      },
      currentScale: 1,
    });
    const computedState: any = {
      actualPosition: computed(() => {
        // Relative position between 0 and 100
        const pos =
          ((computedState.actualMiddleRange.value - state.dragRangeMiddle.min) *
            100) /
          (state.dragRangeMiddle.max - state.dragRangeMiddle.min);

        return pos;
      }),
      actualMiddleRange: computed(() => {
        return (
          state.dragRange.min + (state.dragRange.max - state.dragRange.min) / 2
        );
      }),
    };
    const methods = {
      calculatedDragRanges: () => {
        return {
          min: stateless.maxRange / 2 - stateless.maxRange / 2 / props.scale,
          max: stateless.maxRange / 2 / props.scale + stateless.maxRange / 2,
        };
      },
    };
    watch(
      () => props.scale,
      () => {
        // We want to save the old min and max to we can detect if they change at the end of the watch function;
        // const oldMin = state.dragRange.min;

        // ***********************
        // Main logic
        // ***********************
        // This feature is used when to user zoom in or out
        // Depending on the scale value, we want to adjust the min and max of the scroll.
        // We want to keep the middle of the scroll in the same position.

        if (props.scale >= 1 && computedState.actualMiddleRange.value !== 50) {
          if (props.scale > state.currentScale) {
            // ZOOM IN
            state.dragRange.min =
              methods.calculatedDragRanges().min +
              (computedState.actualMiddleRange.value - stateless.maxRange / 2);
            state.dragRange.max =
              methods.calculatedDragRanges().max +
              (computedState.actualMiddleRange.value - stateless.maxRange / 2);
            /*ctx.emit('update:min', {
              value: state.dragRange.min,
              actualScrollPos: computedState.actualPosition.value,
            });
            ctx.emit('update:max', {
              value: state.dragRange.max,
              actualScrollPos: computedState.actualPosition.value,
            });*/
            /*if (state.dragRange.min === 0 && state.dragRange.max !== 100) {
              state.dragRange.min = 0;
              state.dragRange.max =
                methods.calculatedDragRanges().max +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              ctx.emit('update:max', {
                value: state.dragRange.max,
                actualScrollPos: computedState.actualPosition.value,
              });
            } else if (
              state.dragRange.max === 100 &&
              state.dragRange.min !== 0
            ) {
              state.dragRange.max = 100;
              state.dragRange.min =
                methods.calculatedDragRanges().min +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              ctx.emit('update:min', {
                value: state.dragRange.min,
                actualScrollPos: computedState.actualPosition.value,
              });
            } else {
              state.dragRange.min =
                methods.calculatedDragRanges().min +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              state.dragRange.max =
                methods.calculatedDragRanges().max +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
            }*/
          } else {
            // ZOOM OUT
            if (state.dragRange.min <= 0 && state.dragRange.max < 100) {
              state.dragRange.min = 0;
              state.dragRange.max =
                methods.calculatedDragRanges().max +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              ctx.emit('update:min', {
                value: state.dragRange.min,
                actualScrollPos: computedState.actualPosition.value,
              });
              ctx.emit('update:max', {
                value: state.dragRange.max,
                actualScrollPos: computedState.actualPosition.value,
              });
            } else if (state.dragRange.max >= 100 && state.dragRange.min > 0) {
              state.dragRange.max = 100;
              state.dragRange.min =
                methods.calculatedDragRanges().min +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              ctx.emit('update:min', {
                value: state.dragRange.min,
                actualScrollPos: computedState.actualPosition.value,
              });
              ctx.emit('update:max', {
                value: state.dragRange.max,
                actualScrollPos: computedState.actualPosition.value,
              });
            } else {
              state.dragRange.min =
                methods.calculatedDragRanges().min +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
              state.dragRange.max =
                methods.calculatedDragRanges().max +
                (computedState.actualMiddleRange.value -
                  stateless.maxRange / 2);
            }
          }
        } else {
          state.dragRange.min = methods.calculatedDragRanges().min;
          state.dragRange.max = methods.calculatedDragRanges().max;
        }

        // ***********************
        // Compute the position of the cursor
        // ***********************

        let min = methods.calculatedDragRanges().max - stateless.maxRange / 2;
        let max = stateless.maxRange - min;

        if (max > 100) {
          max = 100;
          ctx.emit('update:max', {
            value: state.dragRange.max,
            actualScrollPos: computedState.actualPosition.value,
          });
        }

        if (min < 0) {
          min = 0;
          ctx.emit('update:min', {
            value: state.dragRange.min,
            actualScrollPos: computedState.actualPosition.value,
          });
        }

        state.dragRangeMiddle.min = min;
        state.dragRangeMiddle.max = max;
        state.currentScale = props.scale;

        // ***********************
      }
    );
    return {
      stateless,
      state,
      computedState,
      emit: ctx.emit,
    };
  },
});
</script>

<style scoped lang="scss">
.noPadding {
  &:deep() {
    .q-slider__track-container--h {
      padding: 0;
    }

    .q-slider__track-container--v {
      padding: 0;
    }
  }
}
</style>
