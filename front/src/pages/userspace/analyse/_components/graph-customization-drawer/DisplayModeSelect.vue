<template>
  <div
    class="display-mode-select-host"
    :class="{ 'is-disabled': disable }"
  >
    <q-tooltip v-if="disable">
      {{ $t('graphUi.discreteCategoryNormalOnly') }}
    </q-tooltip>
    <q-btn
      type="button"
      outline
      dense
      no-caps
      unelevated
      align="between"
      class="full-width display-mode-trigger"
      :disable="disable"
    >
      <span class="ellipsis display-mode-label">{{ currentLabel }}</span>
      <q-icon name="arrow_drop_down" size="xs" class="q-ml-xs" />
      <q-menu
        v-if="!disable"
        fit
        separate-close-popup
        class="display-mode-menu"
      >
        <q-list dense>
          <q-item
            clickable
            v-close-popup
            :active="isNormal"
            @click="selectNormal"
          >
            <q-item-section>{{ $t('graphUi.displayNormal') }}</q-item-section>
            <q-item-section v-if="isNormal" side>
              <q-icon name="check" size="xs" />
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            :active="isFrieze"
            @click="selectFrieze"
          >
            <q-item-section>{{ $t('graphUi.displayFrieze') }}</q-item-section>
            <q-item-section v-if="isFrieze" side>
              <q-icon name="check" size="xs" />
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup="false"
            :active="isBackground"
          >
            <q-item-section>{{ $t('graphUi.displayBackground') }}</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_left" size="xs" />
            </q-item-section>
            <q-menu
              anchor="top start"
              self="top end"
            >
              <q-list dense class="background-support-menu">
                <q-item
                  clickable
                  v-close-popup="2"
                  :active="isBackground && !supportCategoryId"
                  @click="selectBackground(null)"
                >
                  <q-item-section>{{ $t('graphUi.backgroundOfAll') }}</q-item-section>
                  <q-item-section v-if="isBackground && !supportCategoryId" side>
                    <q-icon name="check" size="xs" />
                  </q-item-section>
                </q-item>
                <q-separator v-if="supportOptions.length > 0" />
                <q-item
                  v-for="option in supportOptions"
                  :key="option.id"
                  clickable
                  v-close-popup="2"
                  :active="isBackground && supportCategoryId === option.id"
                  @click="selectBackground(option.id)"
                >
                  <q-item-section class="ellipsis">{{ option.name }}</q-item-section>
                  <q-item-section
                    v-if="isBackground && supportCategoryId === option.id"
                    side
                  >
                    <q-icon name="check" size="xs" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { DisplayModeEnum } from '@services/observations/interface';
import type { DisplayModeChoice } from './graph-preferences.utils';

export type BackgroundSupportOption = {
  id: string;
  name: string;
};

export default defineComponent({
  name: 'DisplayModeSelect',
  props: {
    disable: {
      type: Boolean,
      default: false,
    },
    displayMode: {
      type: String as PropType<DisplayModeEnum>,
      required: true,
    },
    supportCategoryId: {
      type: String as PropType<string | null>,
      default: null,
    },
    supportOptions: {
      type: Array as PropType<BackgroundSupportOption[]>,
      default: () => [],
    },
  },
  emits: {
    change: (_payload: DisplayModeChoice) => true,
  },
  setup(props, { emit }) {
    const { t } = useI18n();

    const isNormal = computed(() => props.displayMode === DisplayModeEnum.Normal);
    const isFrieze = computed(() => props.displayMode === DisplayModeEnum.Frieze);
    const isBackground = computed(() => props.displayMode === DisplayModeEnum.Background);

    const currentLabel = computed(() => {
      if (props.disable || isNormal.value) {
        return t('graphUi.displayNormal');
      }
      if (isFrieze.value) {
        return t('graphUi.displayFrieze');
      }
      if (isBackground.value) {
        if (!props.supportCategoryId) {
          return t('graphUi.backgroundOfAll');
        }
        const supportName = props.supportOptions.find(
          (option) => option.id === props.supportCategoryId,
        )?.name;
        return supportName
          ? t('graphUi.backgroundOfCategory', { name: supportName })
          : t('graphUi.displayBackground');
      }
      return t('graphUi.displayNormal');
    });

    const selectNormal = () => {
      emit('change', {
        displayMode: DisplayModeEnum.Normal,
        supportCategoryId: null,
      });
    };

    const selectFrieze = () => {
      emit('change', {
        displayMode: DisplayModeEnum.Frieze,
        supportCategoryId: null,
      });
    };

    const selectBackground = (supportCategoryId: string | null) => {
      emit('change', {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId,
      });
    };

    return {
      currentLabel,
      isNormal,
      isFrieze,
      isBackground,
      selectNormal,
      selectFrieze,
      selectBackground,
    };
  },
});
</script>

<style scoped lang="scss">
.display-mode-select-host {
  width: 100%;

  &.is-disabled {
    cursor: help;
  }
}

.display-mode-trigger {
  width: 100%;
  min-height: 40px;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
}

.display-mode-label {
  min-width: 0;
  flex: 1;
  text-align: left;
}

.background-support-menu {
  min-width: 180px;
  max-width: 280px;
  max-height: 50vh;
}
</style>
