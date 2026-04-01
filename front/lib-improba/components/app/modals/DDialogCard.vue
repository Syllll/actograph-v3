<template>
  <DCard
    class="q-dialog-plugin d-dialog-card"
    :class="sizeClass"
    bgColor="background"
    :innerHeader="!!title || !!icon || !!$slots['inner-header-actions']"
    :title="title"
    :icon="icon"
    :useInnerPadding="useInnerPadding"
    :verticalShrink="verticalShrink"
  >
    <template v-if="$slots['inner-header-actions']" v-slot:inner-header-actions>
      <slot name="inner-header-actions" />
    </template>

    <DCardSection>
      <slot />
    </DCardSection>

    <DCardSection v-if="hasFooter">
      <div class="row items-center justify-end full-width q-gutter-md">
        <slot name="actions">
          <DCancelBtn
            v-if="cancelLabel"
            :label="cancelLabel"
            :disable="cancelDisable"
            @click="$emit('cancel')"
          />
          <DSubmitBtn
            v-if="submitLabel"
            :label="submitLabel"
            :disable="submitDisable"
            :loading="submitLoading"
            @click="$emit('submit')"
          />
        </slot>
      </div>
    </DCardSection>
  </DCard>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import DCard from '../cards/DCard.vue';
import DCardSection from '../cards/DCardSection.vue';
import DCancelBtn from '../buttons/DCancelBtn.vue';
import DSubmitBtn from '../buttons/DSubmitBtn.vue';

const VALID_SIZES = ['sm', 'md', 'lg', 'xl', 'wide', 'auto'] as const;

export default defineComponent({
  name: 'DDialogCard',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  props: {
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    size: {
      type: String,
      default: 'sm',
      validator: (v: string) => (VALID_SIZES as readonly string[]).includes(v),
    },
    useInnerPadding: { type: Boolean, default: true },
    verticalShrink: { type: Boolean, default: true },
    cancelLabel: { type: String, default: undefined },
    cancelDisable: { type: Boolean, default: false },
    submitLabel: { type: String, default: undefined },
    submitDisable: { type: Boolean, default: false },
    submitLoading: { type: Boolean, default: false },
  },
  emits: ['cancel', 'submit'],
  setup(props, { slots }) {
    const sizeClass = computed(() => {
      if (props.size === 'auto') return '';
      return `d-dialog-card--${props.size}`;
    });

    const hasFooter = computed(() => {
      return !!slots.actions || !!props.cancelLabel || !!props.submitLabel;
    });

    return { sizeClass, hasFooter };
  },
});
</script>

<style lang="scss">
.d-dialog-card {
  .q-card {
    border: 1px solid var(--neutral-low);
    border-radius: 12px;
    box-shadow: 0 16px 36px var(--neutral-high-20);
    overflow: hidden;
  }

  &--sm {
    min-width: 400px;
    max-width: 90vw;
  }

  &--md {
    min-width: 500px;
    max-width: 700px;
  }

  &--lg {
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
  }

  &--xl {
    min-width: 700px;
    max-width: 900px;
  }

  &--wide {
    width: 90vw;
    max-width: 900px;
    height: 85vh;
  }
}
</style>
