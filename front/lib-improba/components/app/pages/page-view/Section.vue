<template>
  <div class="row q-mt-md q-mb-md items-center views-section">
    <q-card class="full-width full-height no-margin bg-secondary-medium" flat>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon v-if="icon" :name="icon" size="md" class="round" />
        <div class="text-bold text-uppercase">{{ $t(title) }}</div>
        <q-space />
        <slot name="action"></slot>
      </q-card-section>
      <q-card-section>
        <slot></slot>
      </q-card-section>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    icon: {
      type: String,
      default: () => '',
    },
    title: {
      type: String,
      default: () => '',
    },
  },
});
</script>
