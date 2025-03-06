<template>
  <q-btn-dropdown flat no-caps color="d-primary">
    <template
      v-for="([slotKey], index) in Object.entries($slots)"
      :key="index"
      v-slot:[slotKey]="scope"
    >
      <slot v-if="$slots[slotKey]" :name="slotKey" v-bind="{ ...scope }"></slot>
    </template>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {},
});
</script>
