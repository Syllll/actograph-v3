<template>
  <div class="column q-gutter-xs">
    <div class="row items-center q-gutter-sm">
      <div class="text-caption text-grey-7">Motif d'arrière-plan</div>
      <q-chip
        v-if="props.isInherited"
        size="sm"
        color="primary"
        text-color="white"
      >
        Hérite
      </q-chip>
    </div>
    <q-select
      :model-value="displayPattern"
      :options="patternOptions"
      option-label="label"
      option-value="value"
      outlined
      dense
      emit-value
      map-options
      @update:model-value="methods.updatePattern"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <div
              class="pattern-preview"
              :style="{
                width: '30px',
                height: '30px',
                backgroundColor: '#f0f0f0',
                border: '1px solid rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }"
            >
              <!-- Preview sera implémenté avec un canvas ou SVG si nécessaire -->
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
    <div v-if="props.isInherited" class="text-caption text-grey-6">
      Hérite de la catégorie parente
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { IGraphPreferences, BackgroundPatternEnum } from '@services/observations/interface';

export default defineComponent({
  name: 'ItemBackgroundPattern',
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
    currentPattern: {
      type: String,
      default: undefined,
    },
    isInherited: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const patternOptions = [
      { label: 'Aucun motif', value: BackgroundPatternEnum.Solid },
      { label: 'Lignes horizontales', value: BackgroundPatternEnum.Horizontal },
      { label: 'Lignes verticales', value: BackgroundPatternEnum.Vertical },
      { label: 'Diagonales', value: BackgroundPatternEnum.Diagonal },
      { label: 'Grille', value: BackgroundPatternEnum.Grid },
      { label: 'Pointillés', value: BackgroundPatternEnum.Dots },
    ];

    const displayPattern = computed(() => {
      return props.currentPattern || BackgroundPatternEnum.Solid;
    });

    const methods = {
      updatePattern: (value: BackgroundPatternEnum) => {
        const preference: Partial<IGraphPreferences> = {
          backgroundPattern: value,
        };
        emit('update', preference);
      },
    };

    return {
      props,
      patternOptions,
      displayPattern,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.pattern-preview {
  // Les prévisualisations seront implémentées avec des textures PixiJS plus tard
}
</style>
