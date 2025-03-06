<template>
  <q-field :label="label" stack-label :color="computed.color.value">
    <div class="self-center full-width">
      {{ content }}
      <slot></slot>
    </div>
  </q-field>
</template>

<script lang="ts">
import { defineComponent, computed as comp } from 'vue';
import { useQuasar } from 'quasar';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: undefined,
    },
    content: {
      type: String,
      default: '',
    },
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
