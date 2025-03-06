<template>
  <DBtn
    color="a1-primary"
    class="a1-button a1-primary"
    :class="props.class"
    :label="
      props.label ?? i18n.t('components.buttons.DSubmitBtn.label')
    "
    no-caps
  >
    <slot></slot>
  </DBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: 'Hello A1',
    },
    class: {
      type: String,
      default: '',
      builderOptions: { label: 'Class' },
    }
  },
  builderOptions: {
    slots: [],
    category: 'A1',
    description: 'A1 Themed button',
  },
  mounted() {
  },
  setup(props, context) {
    const i18n = useI18n();
    return {
      i18n,
      props,
    };
  },
});
</script>
