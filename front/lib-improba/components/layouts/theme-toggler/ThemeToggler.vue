<template>
  <q-toggle
    class="q-pa-none"
    :modelValue="!theme.quasar.dark.isActive"
    @update:modelValue="theme.methods.setTheme(!$event)"
    size="lg"
    color="danger-medium"
    keep-color
    checkedIcon="light_mode"
    uncheckedIcon="brightness_2"
    :label="$props.label"
    left-label
  />
</template>

<script lang="ts">
import { defineComponent, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { useTheme } from 'src/../lib-improba/composables/use-theme';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: 'Thème',
    },
  },
  setup() {
    const quasar = useQuasar();
    const theme = useTheme(quasar);
    const i18n = useI18n();
    const state = reactive({});

    const methods = {
      init() {
        theme.methods.init();
      },
    };

    onMounted(() => {
      methods.init();
    });

    return {
      i18n,
      theme,
    };
  },
});
</script>