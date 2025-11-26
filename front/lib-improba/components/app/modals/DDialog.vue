<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      :style="{ minWidth: width, maxHeight: maxHeight }"
      :bgColor="bgColor"
      :innerHeader="!!title"
      :title="title"
      :useInnerPadding="useInnerPadding"
    >
      <DCardSection>
        <slot></slot>
      </DCardSection>

      <DCardSection v-if="$slots.actions" class="q-mt-md">
        <div class="row items-center justify-end full-width q-gutter-md">
          <slot name="actions"></slot>
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DCard, DCardSection } from '@lib-improba/components';

export default defineComponent({
  name: 'DDialog',
  components: {
    DCard,
    DCardSection,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    width: {
      type: String,
      default: '400px',
    },
    maxHeight: {
      type: String,
      default: undefined,
    },
    bgColor: {
      type: String,
      default: 'background',
    },
    useInnerPadding: {
      type: Boolean,
      default: true,
    },
  },
  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup() {
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    return {
      // This is REQUIRED;
      // Need to inject these (from useDialogPluginComponent() call)
      // into the template and the component instance
      dialogRef,
      onDialogHide,

      // other methods that we used in our vue html template;
      // these are part of our example (so not required)
      onOKClick: onDialogOK,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>
