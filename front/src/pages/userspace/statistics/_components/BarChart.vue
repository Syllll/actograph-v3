<template>
  <div class="column q-gutter-sm">
    <div
      v-for="(item, index) in data"
      :key="index"
      class="column"
    >
      <div class="row items-center q-gutter-sm q-mb-xs">
        <div class="text-body2" style="min-width: 150px;">{{ item.label }}</div>
        <div class="col">
          <div
            :style="{
              height: '24px',
              backgroundColor: color,
              width: `${barWidth(item.value)}%`,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }"
          />
        </div>
        <div class="text-body2 text-weight-medium" style="min-width: 100px; text-align: right;">
          {{ item.formattedValue || formatDuration(item.value) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h ${minutes % 60}min`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}min ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export default defineComponent({
  name: 'BarChart',
  props: {
    data: {
      type: Array as () => Array<{
        label: string;
        value: number;
        formattedValue?: string;
      }>,
      required: true,
    },
    colors: {
      type: String,
      default: '#1976D2',
    },
  },
  setup(props) {
    const maxValue = computed(() => {
      if (props.data.length === 0) {
        return 1;
      }
      return Math.max(...props.data.map((item) => item.value));
    });

    const barWidth = (value: number): number => {
      if (maxValue.value === 0) {
        return 0;
      }
      return (value / maxValue.value) * 100;
    };

    return {
      color: computed(() => props.colors),
      barWidth,
      formatDuration,
    };
  },
});
</script>

