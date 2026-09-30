<template>
  <q-banner v-bind="$attrs" dense rounded>
    <template #avatar>
      <q-icon name="warning" color="warning" />
    </template>
    {{ t('graphUi.readingsAfterLastStopWarning') }}
  </q-banner>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'ReadingsAfterLastStopBanner',
  inheritAttrs: true,

  setup() {
    const { t } = useI18n();
    return { t };
  },
});
</script>
