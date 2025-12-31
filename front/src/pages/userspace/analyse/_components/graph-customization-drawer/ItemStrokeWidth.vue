<template>
  <div class="column q-gutter-xs">
    <div class="row items-center q-gutter-sm">
      <div class="text-caption text-grey-7">Épaisseur</div>
      <q-chip
        v-if="props.isInherited"
        size="sm"
        color="primary"
        text-color="white"
      >
        Hérite
      </q-chip>
    </div>
    <div class="row items-center q-gutter-md">
      <q-slider
        :model-value="displayStrokeWidth"
        :min="1"
        :max="10"
        :step="1"
        label
        :label-value="`${displayStrokeWidth}px`"
        @update:model-value="methods.updateStrokeWidth"
      />
      <div class="text-body2" style="min-width: 40px; text-align: center;">
        {{ displayStrokeWidth }}px
      </div>
    </div>
    <div v-if="props.isInherited" class="text-caption text-grey-6">
      Hérite de la catégorie parente
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { IGraphPreferences } from '@services/observations/interface';

export default defineComponent({
  name: 'ItemStrokeWidth',
  props: {
    itemId: {
      type: String,
      required: true,
    },
    itemType: {
      type: String,
      required: true,
      validator: (value: string) => ['category', 'observable'].includes(value),
    },
    currentStrokeWidth: {
      type: Number,
      default: undefined,
    },
    isInherited: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const displayStrokeWidth = computed(() => {
      return props.currentStrokeWidth ?? 2;
    });

    const methods = {
      updateStrokeWidth: (value: number | null) => {
        if (value === null) return;
        const preference: Partial<IGraphPreferences> = {
          strokeWidth: value,
        };
        emit('update', preference);
      },
    };

    return {
      props,
      displayStrokeWidth,
      methods,
    };
  },
});
</script>
