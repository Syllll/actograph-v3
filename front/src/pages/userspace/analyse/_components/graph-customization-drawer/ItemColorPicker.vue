<template>
  <div class="column q-gutter-xs">
    <div class="text-caption text-grey-7">Couleur</div>
    <div class="row items-center q-gutter-sm">
      <div
        class="color-preview"
        :style="{
          backgroundColor: displayColor || '#10b981',
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }"
        @click="methods.openColorPicker"
      >
        <q-icon
          v-if="props.isInherited"
          name="mdi-inheritance"
          size="16px"
          color="white"
          style="position: absolute; top: 2px; right: 2px;"
        />
      </div>
      <div class="col">
        <q-input
          :model-value="displayColor || '#10b981'"
          placeholder="#10b981"
          outlined
          dense
          readonly
          @click="methods.openColorPicker"
        >
          <template v-slot:append>
            <q-icon
              name="mdi-palette"
              class="cursor-pointer"
              @click.stop="methods.openColorPicker"
            />
          </template>
        </q-input>
      </div>
    </div>
    <div v-if="props.isInherited" class="text-caption text-grey-6">
      Hérite de la catégorie parente
    </div>
  </div>

  <q-dialog v-model="state.showColorDialog" @hide="methods.onColorDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 350px; min-height: 700px; max-height: 85vh; display: flex; flex-direction: column;"
      bgColor="background"
      innerHeader
      title="Choisir une couleur"
    >
      <DCardSection style="flex: 1; min-height: 550px; overflow: auto; display: flex; flex-direction: column;">
        <q-color
          v-model="state.selectedColor"
          format-model="hex"
          no-header-tabs
          style="flex: 1;"
        />
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-center full-width q-gutter-md">
          <DCancelBtn @click="methods.cancelColor" />
          <DSubmitBtn label="Valider" @click="methods.confirmColor" />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { IGraphPreferences } from '@services/observations/interface';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'ItemColorPicker',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
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
    currentColor: {
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
    const state = reactive({
      showColorDialog: false,
      selectedColor: props.currentColor || '#10b981',
    });

    const displayColor = computed(() => {
      return props.currentColor || '#10b981';
    });

    const methods = {
      openColorPicker: () => {
        state.selectedColor = displayColor.value;
        state.showColorDialog = true;
      },
      confirmColor: () => {
        const preference: Partial<IGraphPreferences> = {
          color: state.selectedColor,
        };
        emit('update', preference);
        state.showColorDialog = false;
      },
      cancelColor: () => {
        state.showColorDialog = false;
      },
      onColorDialogHide: () => {
        // Reset to current color if dialog is closed without confirming
        state.selectedColor = displayColor.value;
      },
    };

    return {
      props,
      state,
      displayColor,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.color-preview {
  position: relative;
}
</style>
