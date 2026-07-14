<template>
  <div class="column q-gutter-xs">
    <div class="text-caption text-neutral-high">{{ t('graphUi.colorFieldLabel') }}</div>
    <div class="row items-center q-gutter-sm">
      <div
        class="color-preview"
        :style="{
          backgroundColor: displayColor || '#10b981',
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          border: '1px solid var(--neutral-low)',
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
    <div v-if="props.isInherited" class="text-caption text-neutral-high">
      {{ t('graphUi.colorInheritedHint') }}
    </div>
  </div>

  <q-dialog v-model="state.showColorDialog" class="actograph-dialog" @hide="methods.onColorDialogHide">
    <DDialogCard
      :title="t('graphUi.chooseColorTitle')"
      size="auto"
      :cancelLabel="t('dialogs.cancel')"
      :submitLabel="t('graphUi.validate')"
      @cancel="methods.cancelColor"
      @submit="methods.confirmColor"
    >
      <q-color
        v-model="state.selectedColor"
        format-model="hex"
        no-header-tabs
        flat
        class="color-picker-widget"
      />
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IGraphPreferences } from '@services/observations/interface';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'ItemColorPicker',
  components: { DDialogCard },
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
    const { t } = useI18n();
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
        state.selectedColor = displayColor.value;
      },
    };

    return {
      t,
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

.color-picker-widget {
  display: block;
  width: 320px;
  max-width: 100%;
  margin: 0 auto;
}
</style>
