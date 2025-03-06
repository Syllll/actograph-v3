<template>
  <MyField
    class="self-center full-width"
    :label="label"
    xcolor="computed.color.value"
    :readonly="readonly"
  >
    <div class="full-width row justify-between">
      <div>{{ content }}</div>
      <div v-if="!readonly">
        <q-btn flat dense rounded :icon="icon" @click="$emit('buttonClick')" />
      </div>
    </div>
  </MyField>
</template>

<script lang="ts">
import { defineComponent, computed as comp } from 'vue';
import { useQuasar } from 'quasar';

import MyField from './Field.vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: null,
    },
    content: {
      type: [String, Number, Object, Boolean],
      default: '',
    },
    icon: {
      type: String,
      default: 'edit',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    MyField,
  },
  setup(props) {
    const quasar = useQuasar();

    const computed = {
      color: comp(() =>
        props.color ?? quasar.dark.isActive ? 'white' : 'black'
      ),
    };

    return {
      quasar,
      computed,
    };
  },
});
</script>
