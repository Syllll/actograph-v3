<template>
  <div class="row items-center q-gutter-md">
    <div class="col-6">
      <svg :width="size" :height="size" viewBox="0 0 200 200">
        <g transform="translate(100, 100)">
          <path
            v-for="(slice, index) in slices"
            :key="index"
            :d="slice.path"
            :fill="colors[index % colors.length]"
            :stroke="'white'"
            :stroke-width="2"
            @mouseenter="state.hoveredIndex = index"
            @mouseleave="state.hoveredIndex = null"
            :opacity="state.hoveredIndex === index ? 0.8 : 1"
            style="cursor: pointer;"
          />
        </g>
      </svg>
    </div>
    <div class="col-6">
      <div class="column q-gutter-xs">
        <div
          v-for="(item, index) in data"
          :key="index"
          class="row items-center q-gutter-sm"
          @mouseenter="state.hoveredIndex = index"
          @mouseleave="state.hoveredIndex = null"
          :style="{
            opacity: state.hoveredIndex === null || state.hoveredIndex === index ? 1 : 0.5,
            cursor: 'pointer',
          }"
        >
          <div
            :style="{
              width: '16px',
              height: '16px',
              backgroundColor: colors[index % colors.length],
              borderRadius: '2px',
            }"
          />
          <div class="text-body2">{{ item.label }}</div>
          <q-space />
          <div class="text-body2 text-weight-medium">{{ item.value.toFixed(1) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';

interface PieSlice {
  path: string;
  percentage: number;
}

export default defineComponent({
  name: 'PieChart',
  props: {
    data: {
      type: Array as () => Array<{ label: string; value: number }>,
      required: true,
    },
    colors: {
      type: Array as () => string[],
      required: true,
    },
    size: {
      type: Number,
      default: 200,
    },
  },
  setup(props) {
    const state = reactive({
      hoveredIndex: null as number | null,
    });

    const total = computed(() => {
      return props.data.reduce((sum, item) => sum + item.value, 0);
    });

    const slices = computed((): PieSlice[] => {
      if (total.value === 0) {
        return [];
      }

      const radius = 80;
      let currentAngle = -Math.PI / 2; // Start from top

      return props.data.map((item) => {
        const percentage = item.value / total.value;
        const angle = percentage * 2 * Math.PI;
        const endAngle = currentAngle + angle;

        const x1 = Math.cos(currentAngle) * radius;
        const y1 = Math.sin(currentAngle) * radius;
        const x2 = Math.cos(endAngle) * radius;
        const y2 = Math.sin(endAngle) * radius;

        const largeArcFlag = angle > Math.PI ? 1 : 0;

        const path = `
          M 0 0
          L ${x1} ${y1}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
          Z
        `;

        currentAngle = endAngle;

        return {
          path,
          percentage: percentage * 100,
        };
      });
    });

    return {
      state,
      slices,
    };
  },
});
</script>

